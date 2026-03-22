import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Blocks admin accounts from accessing regular user routes. */
export const userOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};
