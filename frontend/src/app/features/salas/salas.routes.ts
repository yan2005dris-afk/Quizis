import { Routes } from '@angular/router';

export const SALAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/salas-index/salas-index.component').then((m) => m.SalasIndexComponent),
  },

  {
    path: ':salaId/game-over',
    loadComponent: () =>
      import('../room/pages/game-over/game-over.component').then((m) => m.GameOverComponent),
  },
  {
    path: ':salaId/analiticas',
    loadComponent: () =>
      import('../room/pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
];
