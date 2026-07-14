import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import type { Role } from './models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.ensureSession().pipe(map((ok) => ok ? true : router.createUrlTree(['/login'])));
};

export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.ensureSession().pipe(map((ok) => ok && auth.user() && roles.includes(auth.user()!.role) ? true : router.createUrlTree(['/dashboard'])));
};
