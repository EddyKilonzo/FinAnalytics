import { SetMetadata } from "@nestjs/common";
import { SKIP_ONBOARDING_KEY } from "../guards/onboarding.guard";

/**
 * Skip the OnboardingGuard on a specific route or whole controller.
 *
 * @example
 *   @SkipOnboarding()
 *   @Patch('onboarding')
 *   async completeOnboarding(...) {}
 */
export const SkipOnboarding = () => SetMetadata(SKIP_ONBOARDING_KEY, true);
