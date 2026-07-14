import type { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login.component').then((m) => m.LoginComponent) },
  {
    path: '', canActivate: [authGuard], loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent), children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'sales/new', loadComponent: () => import('./features/sale-form.component').then((m) => m.SaleFormComponent) },
      { path: 'sales/:id/edit', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./features/sale-form.component').then((m) => m.SaleFormComponent) },
      { path: 'sales', loadComponent: () => import('./features/sales-list.component').then((m) => m.SalesListComponent) },
      { path: 'catalogs', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./features/catalogs.component').then((m) => m.CatalogsComponent) },
      { path: 'users', canActivate: [roleGuard('ADMIN')], loadComponent: () => import('./features/users.component').then((m) => m.UsersComponent) },
      { path: 'reports', canActivate: [roleGuard('ADMIN', 'SENIOR_ASSISTANT')], loadComponent: () => import('./features/reports.component').then((m) => m.ReportsComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
