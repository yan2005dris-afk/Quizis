import { Routes } from '@angular/router';

export const QUESTION_BANK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/index/bank-index.component').then((m) => m.BankIndexComponent),
  },
  {
    path: 'crear',
    loadComponent: () =>
      import('./pages/form/bank-form.component').then((m) => m.BankFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/form/bank-form.component').then((m) => m.BankFormComponent),
  },
];
