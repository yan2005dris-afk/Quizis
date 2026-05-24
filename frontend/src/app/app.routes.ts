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
  // Rutas públicas — sin auth, sin layout base (ej. login)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent },
  { path: 'privacy', component: LoginComponent },
  { path: 'show', component: ActiveQuestionComponent },

  // Rutas bajo el Layout (Híbrido: Privado o Público según Auth)
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      // Rutas Privadas (Requieren Auth)
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'salas', component: SalasIndexComponent, canActivate: [authGuard] },
      { path: 'preguntas', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'usuarios', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'configuracion', component: DashboardComponent, canActivate: [authGuard] },

      // Rutas Públicas bajo Layout (Se adaptan si hay auth)
      { path: 'sala/:id', component: RoomComponent },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback mediante componente para decidir dinámicamente según estado real de auth
  { path: '**', component: PageNotFoundComponent },
];
