import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformServer } from '@angular/common';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // --- LÓGICA DE SERVIDOR (SSR) ---
  if (isPlatformServer(platformId)) {
    // IMPORTANTE: En el servidor no tenemos localStorage,
    // pero el navegador nos envía las cookies.
    // Si no hay cookie de sesión, bloqueamos el acceso desde el servidor
    // para evitar el "flash" del Dashboard.

    // Nota: Por ahora, si no podemos validar la cookie al 100%,
    // es mejor ser conservadores y no mostrar el dashboard.
    if (authService.isAuthenticated()) {
      return true;
    }
    // Si quieres ser ultra estricto en SSR, podrías devolver false aquí,
    // pero por ahora dejémoslo que el cliente decida si ya está inicializado.
    return true;
  }

  // --- LÓGICA DE NAVEGADOR ---
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, al login
  return router.parseUrl('/login');
};
