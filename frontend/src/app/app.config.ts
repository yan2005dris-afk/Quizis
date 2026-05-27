import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
// Static SPA — no SSR, no client hydration needed
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';
import { SOCKET_SERVER_URL } from './core/services/socket.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]), // Registramos el interceptor aquí
    ),
    { provide: SOCKET_SERVER_URL, useValue: environment.apiUrl.replace('/api/v1', '') },
  ],
};
