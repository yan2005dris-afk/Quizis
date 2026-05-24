import { Routes } from '@angular/router';
import { LoginAudiencia } from './login-audiencia/login-audiencia';

export const routes: Routes = [
  // Ruta por defecto: Redirecciona automáticamente al login de audiencia
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // Tu pantalla asignada a la ruta '/login'
  { path: 'login', component: LoginAudiencia }
];