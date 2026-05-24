import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { LoginAudiencia } from './login-audiencia/login-audiencia';

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent }, // Placeholder para evitar 404
  { path: 'privacy', component: LoginComponent }, // Placeholder
  { path: 'room/:token', component: LoginAudiencia },

  // Rutas privadas (Protegidas por Layout y Guard)
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'salas', component: DashboardComponent },
      { path: 'preguntas', component: DashboardComponent },
      { path: 'usuarios', component: DashboardComponent },
      { path: 'configuracion', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback definitivo al login
  { path: '**', redirectTo: 'login' },
];
