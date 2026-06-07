import { Routes } from '@angular/router';

export const SALAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/index/room-index.component').then((m) => m.RoomIndexComponent),
  },

  {
    path: ':salaId/game-over',
    loadComponent: () =>
      import('../game/pages/game-over/game-over.component').then((m) => m.GameOverComponent),
  },
  {
    path: ':salaId/analiticas',
    loadComponent: () =>
      import('../../reports/pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
];
