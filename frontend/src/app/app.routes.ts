import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';

export const routes: Routes = [
  // Redirección inicial: si no hay ruta, va a login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas de Autenticación (Públicas, sin layout)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },

  // Rutas de Sala (Públicas, sin layout o layout especial)
  {
    path: 'show',
    loadComponent: () =>
      import('./features/room/components/active-question/active-question.component').then(
        (m) => m.ActiveQuestionComponent,
      ),
  },

  // Rutas bajo el Layout (Híbrido: Privado o Público según Auth)
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      // Rutas Privadas
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'salas',
        canActivate: [authGuard],
        loadChildren: () => import('./features/salas/salas.routes').then((m) => m.SALAS_ROUTES),
      },
      {
        path: 'bancos',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/question-bank/question-bank.routes').then(
            (m) => m.QUESTION_BANK_ROUTES,
          ),
      },

      // Fallbacks para placeholders
      { path: 'preguntas', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'usuarios', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'configuracion', redirectTo: 'dashboard', pathMatch: 'full' },

      // Rutas de Sala (Públicas pero dentro del layout)
      {
        path: 'sala',
        loadChildren: () => import('./features/room/room.routes').then((m) => m.ROOM_ROUTES),
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback 404
  { path: '**', component: PageNotFoundComponent },
];
