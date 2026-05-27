import { Routes } from '@angular/router';

export const SALAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/salas-index/salas-index.component').then((m) => m.SalasIndexComponent),
  },
];
