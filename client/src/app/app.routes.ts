import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/**
 * Main application routes.
 * Utilizes lazy-loading for domain components to optimize bundle size.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./domain/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./domain/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./domain/environment/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'editor/:id',
    loadComponent: () => import('./domain/editor/editor.component').then(m => m.EditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'health',
    loadComponent: () => import('./domain/health/health-dashboard.component').then(m => m.HealthDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
