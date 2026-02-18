import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "../../auth/strategies/jwt.strategy";

/** Metadata key used by @SkipOnboarding() */
export const SKIP_ONBOARDING_KEY = "skipOnboarding";

/**
 * Guard that blocks access to data routes until the user has completed
 * the onboarding wizard (userType + incomeSources submitted).
 *
 * Must be used AFTER JwtAuthGuard so req.user is already populated.
 *
 * Decorate a handler or controller with @SkipOnboarding() to opt out
 * (e.g. the onboarding endpoint itself).
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_ONBOARDING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    const user = req.user;

    if (!user) {
      // JwtAuthGuard should have rejected this first, but guard defensively
      throw new ForbiddenException("Authentication required.");
    }

    if (!user.onboardingCompleted) {
      throw new ForbiddenException(
        "Please complete your onboarding profile before accessing this feature. " +
          "Submit your user type and income sources via PATCH /api/v1/auth/onboarding.",
      );
    }

    return true;
  }
}
