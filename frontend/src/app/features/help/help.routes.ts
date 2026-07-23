import { Routes } from '@angular/router';

export const HELP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/help/help.component').then((m) => m.HelpComponent),
  },
];
