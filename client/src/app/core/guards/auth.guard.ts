import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateService } from '../../domain/auth/auth-state.service';

/**
 * Route guard that prevents unauthenticated users from accessing protected routes.
 * Redirects to the login page if no valid session token exists.
 *
 * @returns {boolean} True if the user is authenticated, false otherwise
 */
export const authGuard: CanActivateFn = () => {
  const authStateService = inject(AuthStateService);
  const router = inject(Router);

  if (authStateService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
