import { Routes } from '@angular/router';
import { ActiveQuestionComponent } from './features/room/active-question/active-question.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { RoomComponent } from './features/room/pages/room/room.component';
import { SalasIndexComponent } from './features/salas/salas-index/salas-index.component';
import { authGuard } from './core/guards/auth.guard';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';

export const routes: Routes = [
  // Rutas públicas — sin auth, sin layout
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent },
  { path: 'privacy', component: LoginComponent },
  { path: 'show', component: ActiveQuestionComponent },
  { path: 'sala/:id', component: RoomComponent },

  // Rutas privadas (Protegidas por Layout y Guard)
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'salas', component: SalasIndexComponent },
      { path: 'preguntas', component: DashboardComponent },
      { path: 'usuarios', component: DashboardComponent },
      { path: 'configuracion', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback mediante componente para decidir dinámicamente según estado real de auth
  { path: '**', component: PageNotFoundComponent },
];
