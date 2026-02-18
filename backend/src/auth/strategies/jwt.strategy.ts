import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import type { Role } from "../../common/enums/role.enum";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
  userType: string | null;
  incomeSources: unknown;
  onboardingCompleted: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        "Session expired or account not found. Please log in again.",
      );
    }
    if (user.suspendedAt) {
      throw new UnauthorizedException(
        "Your account has been suspended. Please contact support.",
      );
    }
    // Always read role fresh from DB — reflects any admin role changes immediately
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }
}
