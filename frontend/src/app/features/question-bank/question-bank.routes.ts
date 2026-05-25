import { Routes } from '@angular/router';

export const QUESTION_BANK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/bank-list/bank-list.component').then((m) => m.BankListComponent),
  },
  {
    path: 'crear',
    loadComponent: () =>
      import('./pages/bank-detail/bank-detail.component').then((m) => m.BankDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/bank-detail/bank-detail.component').then((m) => m.BankDetailComponent),
  },
];
