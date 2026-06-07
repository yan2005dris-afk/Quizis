import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reportes-index/reportes-index.component').then(
        (m) => m.ReportesIndexComponent,
      ),
  },
  {
    path: ':salaId/analiticas',
    loadComponent: () =>
      import('./pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
];
