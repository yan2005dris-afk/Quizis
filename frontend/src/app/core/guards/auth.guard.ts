import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformServer } from '@angular/common';
import { ToastService } from '../services/toast.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  const toastService = inject(ToastService);

  // --- LÓGICA DE SERVIDOR (SSR) ---
  if (isPlatformServer(platformId)) {
    if (authService.isAuthenticated()) {
      return true;
    }
    return true;
  }

  // --- LÓGICA DE NAVEGADOR ---
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, mostramos un mensaje y cancelamos la navegación
  toastService.show(
    'Necesitás iniciar sesión para acceder a esta sección.',
    'danger',
    'Acceso Denegado',
  );

  return false;
};
