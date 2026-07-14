import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';
import { ADMIN_LOGIN_URL } from '../constants/admin-route.constants';

export const adminAuthGuard: CanActivateFn = () => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  if (!adminAuthService.isLoggedIn()) {
    return router.createUrlTree([ADMIN_LOGIN_URL]);
  }

  return adminAuthService.validateSession().pipe(
    map(isValid => {
      if (isValid) {
        return true;
      }

      adminAuthService.clearAdminSession(false);
      return router.createUrlTree([ADMIN_LOGIN_URL]);
    })
  );
};
