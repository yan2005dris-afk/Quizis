import { Routes } from '@angular/router';

export const GAME_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/game-session/game-session.component').then((m) => m.GameSessionComponent),
  },
];
