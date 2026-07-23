import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // Redirección inicial: si no hay ruta, va a login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas privadas (Protegidas por Layout y Guard)

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
      import('./features/rooms/game/pages/active-question/active-question.component').then(
        (m) => m.ActiveQuestionComponent,
      ),
  },
  {
    path: 'join/:token',
    loadComponent: () =>
      import('./features/rooms/game/pages/join-room/join-room.component').then(
        (m) => m.JoinRoomComponent,
      ),
  },
  // Rutas bajo el Layout (Híbrido: Privado o Público según Auth)
  {
    path: 'salas/unirse',
    loadComponent: () =>
      import('./features/rooms/game/pages/join-room/join-room.component').then(
        (m) => m.JoinRoomComponent,
      ),
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Rutas Privadas
      {
        path: 'home',
        canActivate: [authGuard],
        loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'salas',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/rooms/management/salas.routes').then((m) => m.SALAS_ROUTES),
      },
      {
        path: 'bancos',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/question-bank/question-bank.routes').then(
            (m) => m.QUESTION_BANK_ROUTES,
          ),
      },

      {
        path: 'ayuda',
        canActivate: [authGuard],
        loadChildren: () => import('./features/help/help.routes').then((m) => m.HELP_ROUTES),
      },

      // Fallbacks para placeholders
      { path: 'preguntas', redirectTo: 'home', pathMatch: 'full' },
      { path: 'usuarios', redirectTo: 'reportes', pathMatch: 'full' },
      { path: 'configuracion', redirectTo: 'home', pathMatch: 'full' },

      // Reportes / Analytics
      {
        path: 'reportes',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },

      // Rutas de Sala (Públicas pero dentro del layout)
      {
        path: 'sala',
        loadChildren: () => import('./features/rooms/game/play.routes').then((m) => m.PLAY_ROUTES),
      },

      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // Fallback 404
  { path: '**', component: PageNotFoundComponent },
];
