import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // SPA puro — todo se renderiza del lado cliente
  // SSR no aporta valor: app auth-dependiente con Socket.IO en tiempo real
  {
    path: 'sala/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home',
    renderMode: RenderMode.Client,
  },
  {
    path: 'salas',
    renderMode: RenderMode.Client,
  },
  {
    path: 'preguntas',
    renderMode: RenderMode.Client,
  },
  {
    path: 'usuarios',
    renderMode: RenderMode.Client,
  },
  {
    path: 'configuracion',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'register',
    renderMode: RenderMode.Client,
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Client,
  },
  {
    path: 'show',
    renderMode: RenderMode.Client,
  },
  // Catch-all: todo cliente
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
