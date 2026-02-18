import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyEmailCodeDto } from "./dto/verify-email-code.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto";
import { SkipOnboarding } from "../common/decorators/skip-onboarding.decorator";
import {
  AuthResponseDto,
  ProfileResponseDto,
  ErrorResponseDto,
} from "./dto/auth-response.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthUser } from "./strategies/jwt.strategy";

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/signup
   */
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new account",
    description:
      "Creates a new user account and sends a verification email. Login is blocked until email verification is complete.",
  })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: "Account created — access token returned.",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed (invalid email, weak password, etc.)",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "An account with this email already exists.",
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 429, description: "Too many requests." })
  async signUp(@Body() dto: SignUpDto) {
    try {
      const data = await this.authService.signUp(dto);
      return { success: true, message: "Account created successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in signUp",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Registration failed. Please try again later.",
      );
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Sign in to an existing account",
    description:
      "Validates credentials and returns a JWT access token. Rate-limited to 5 attempts per minute per IP.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful — access token returned.",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid email/password or email not verified.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Too many login attempts. Try again in 60 seconds.",
  })
  async login(@Body() dto: LoginDto) {
    try {
      const data = await this.authService.signIn(dto);
      return { success: true, message: "Logged in successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in login",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Login failed. Please try again later.",
      );
    }
  }

  @Get("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify email address",
    description:
      "Verifies a user email using either token link value or 6-digit code.",
  })
  @ApiResponse({
    status: 200,
    description: "Email successfully verified.",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Verification link invalid or expired.",
    type: ErrorResponseDto,
  })
  async verifyEmail(@Query() query: VerifyEmailDto) {
    try {
      const data = await this.authService.verifyEmail(query);
      return { success: true, message: "Email verified successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in verifyEmail",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Email verification failed. Please try again.",
      );
    }
  }

  @Post("verify-email-code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify email with 6-digit code",
    description:
      "Verifies a user email using the 6-digit code sent to their inbox.",
  })
  @ApiBody({ type: VerifyEmailCodeDto })
  @ApiResponse({
    status: 200,
    description: "Email successfully verified with code.",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Verification code invalid or expired.",
    type: ErrorResponseDto,
  })
  async verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    try {
      const data = await this.authService.verifyEmailByCode(dto);
      return { success: true, message: "Email verified successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in verifyEmailCode",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Email verification failed. Please try again.",
      );
    }
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: "Resend verification email",
    description:
      "Resends email verification link if account exists and is unverified.",
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: "Verification email resend attempt completed.",
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    try {
      const data = await this.authService.resendVerification(dto);
      return { success: true, ...data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in resendVerification",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not resend verification email. Please try again.",
      );
    }
  }

  /**
   * PATCH /api/v1/auth/onboarding
   */
  @Patch("onboarding")
  @UseGuards(JwtAuthGuard)
  @SkipOnboarding()
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Complete onboarding",
    description:
      "Saves the user type and income sources selected during the first-time onboarding wizard. Requires a valid Bearer token.",
  })
  @ApiBody({ type: CompleteOnboardingDto })
  @ApiResponse({
    status: 200,
    description: "Onboarding completed successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  async completeOnboarding(
    @Request() req: AuthRequest,
    @Body() dto: CompleteOnboardingDto,
  ) {
    try {
      const data = await this.authService.completeOnboarding(req.user.id, dto);
      return { success: true, message: "Onboarding completed", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in completeOnboarding",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Onboarding failed. Please try again.",
      );
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get current user profile",
    description:
      "Returns the authenticated user. Requires a valid Bearer token in the Authorization header.",
  })
  @ApiResponse({
    status: 200,
    description: "Current user profile.",
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  getProfile(@Request() req: AuthRequest) {
    try {
      return { success: true, data: req.user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in getProfile",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve profile. Please try again.",
      );
    }
  }
}
