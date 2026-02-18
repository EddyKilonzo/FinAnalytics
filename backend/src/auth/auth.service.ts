import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { UsersService } from "../users/users.service";
import { SignUpDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyEmailCodeDto } from "./dto/verify-email-code.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import { MailerService } from "../common/mailer/mailer.service";
import type { JwtPayload } from "./strategies/jwt.strategy";
import type { Role } from "../common/enums/role.enum";

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Pre-generated hash used only to keep bcrypt.compare timing consistent
// when the requested email doesn't exist (prevents user-enumeration via timing).
const TIMING_SAFE_DUMMY_HASH =
  "$2b$12$LrPcb0P5NBYhtc7.v5Y5auSomeInvalidHashForTimingProtection";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async signUp(dto: SignUpDto) {
    try {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(
          "An account with this email already exists",
        );
      }

      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

      const user = await this.usersService.create({
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      });

      this.logger.log(`New user registered: ${user.email} [${user.role}]`);

      const verification = this.createEmailVerificationToken();
      await this.usersService.setEmailVerificationToken(
        user.id,
        verification.tokenHash,
        verification.codeHash,
        verification.expiresAt,
      );

      await this.mailerService.sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        verificationLink: this.buildVerificationLink(
          user.email,
          verification.token,
        ),
        verificationCode: verification.code,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt,
          userType: user.userType ?? null,
          incomeSources: [],
          onboardingCompleted: false,
        },
        requiresEmailVerification: true,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.signUp");
    }
  }

  async signIn(dto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);

      // Always run bcrypt even when user doesn't exist — prevents timing-based
      // user enumeration attacks. The dummy hash will never match.
      const hash = user?.password ?? TIMING_SAFE_DUMMY_HASH;
      const passwordValid = await bcrypt.compare(dto.password, hash);

      if (!user || !passwordValid) {
        throw new UnauthorizedException("Invalid email or password");
      }

      if (!user.emailVerifiedAt) {
        throw new UnauthorizedException(
          "Please verify your email address before logging in.",
        );
      }

      if (user.suspendedAt) {
        throw new UnauthorizedException(
          "Your account has been suspended. Please contact support.",
        );
      }

      this.logger.log(`User signed in: ${user.email} [${user.role}]`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt,
          userType: user.userType,
          incomeSources: user.incomeSources,
          onboardingCompleted: user.onboardingCompleted,
        },
        accessToken: this.generateToken(user.id, user.email, user.role),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.signIn");
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      // Backward-compatible behavior:
      // - long token value from email link -> token verification
      // - 6-digit numeric value -> code verification
      const isCode = /^\d{6}$/.test(dto.token);
      const hashedValue = this.hashToken(dto.token);
      const user = isCode
        ? await this.usersService.findByVerificationCode(dto.email, hashedValue)
        : await this.usersService.findByVerificationToken(
            dto.email,
            hashedValue,
          );

      if (!user) {
        throw new UnauthorizedException(
          isCode
            ? "Verification code is invalid or expired."
            : "Verification link is invalid or expired.",
        );
      }

      const verifiedUser = await this.usersService.markEmailVerified(user.id);
      await this.mailerService.sendWelcomeEmail({
        to: verifiedUser.email,
        name: verifiedUser.name,
      });

      this.logger.log(`Email verified: ${verifiedUser.email}`);

      return {
        user: verifiedUser,
        accessToken: this.generateToken(
          verifiedUser.id,
          verifiedUser.email,
          verifiedUser.role,
        ),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.verifyEmail");
    }
  }

  async verifyEmailByCode(dto: VerifyEmailCodeDto) {
    try {
      const codeHash = this.hashToken(dto.code);
      const user = await this.usersService.findByVerificationCode(
        dto.email,
        codeHash,
      );

      if (!user) {
        throw new UnauthorizedException(
          "Verification code is invalid or expired.",
        );
      }

      const verifiedUser = await this.usersService.markEmailVerified(user.id);
      await this.mailerService.sendWelcomeEmail({
        to: verifiedUser.email,
        name: verifiedUser.name,
      });

      this.logger.log(`Email verified by code: ${verifiedUser.email}`);

      return {
        user: verifiedUser,
        accessToken: this.generateToken(
          verifiedUser.id,
          verifiedUser.email,
          verifiedUser.role,
        ),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.verifyEmailByCode");
    }
  }

  async resendVerification(dto: ResendVerificationDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user || user.emailVerifiedAt) {
        // Generic success to prevent account enumeration.
        return {
          sent: true,
          message:
            "If this account exists and is not verified, a verification email has been sent.",
        };
      }

      const verification = this.createEmailVerificationToken();
      await this.usersService.setEmailVerificationToken(
        user.id,
        verification.tokenHash,
        verification.codeHash,
        verification.expiresAt,
      );

      await this.mailerService.sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        verificationLink: this.buildVerificationLink(
          user.email,
          verification.token,
        ),
        verificationCode: verification.code,
      });

      return {
        sent: true,
        message:
          "If this account exists and is not verified, a verification email has been sent.",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.resendVerification");
    }
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    try {
      const updated = await this.usersService.completeOnboarding(userId, {
        userType: dto.userType,
        incomeSources: dto.incomeSources,
      });

      this.logger.log(`Onboarding completed for user [${userId}]`);

      return { user: updated };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AuthService.completeOnboarding");
    }
  }

  private generateToken(userId: string, email: string, role: Role): string {
    try {
      const payload: JwtPayload = { sub: userId, email, role };
      return this.jwtService.sign(payload);
    } catch (error) {
      this.logger.error(
        "JWT signing failed",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not generate access token. Please try again.",
      );
    }
  }

  private createEmailVerificationToken(): {
    token: string;
    code: string;
    tokenHash: string;
    codeHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString("hex");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    return {
      token,
      code,
      tokenHash: this.hashToken(token),
      codeHash: this.hashToken(code),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private buildVerificationLink(email: string, token: string): string {
    const frontendVerifyUrl = this.config.get<string>(
      "FRONTEND_VERIFY_EMAIL_URL",
    );
    if (frontendVerifyUrl) {
      return `${frontendVerifyUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    }

    const backendBaseUrl =
      this.config.get<string>("BACKEND_URL") ??
      `http://localhost:${this.config.get<string>("PORT", "3000")}`;
    return `${backendBaseUrl}/api/v1/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  }
}
