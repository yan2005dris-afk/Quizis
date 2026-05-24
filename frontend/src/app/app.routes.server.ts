import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas que dependen de IDs dinámicos
  {
    path: 'sala/:id',
    renderMode: RenderMode.Server,
  },
  // Rutas que consumen APIs o requieren autenticación
  {
    path: 'dashboard',
    renderMode: RenderMode.Server,
  },
  {
    path: 'salas',
    renderMode: RenderMode.Server,
  },
  {
    path: 'preguntas',
    renderMode: RenderMode.Server,
  },
  {
    path: 'usuarios',
    renderMode: RenderMode.Server,
  },
  {
    path: 'configuracion',
    renderMode: RenderMode.Server,
  },
  // Rutas estáticas públicas
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  // Por defecto para el resto (incluyendo el fallback **)
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
