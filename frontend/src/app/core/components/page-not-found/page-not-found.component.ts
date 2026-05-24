import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Este componente no tiene visual. Su única función es decidir a dónde 
 * mandar al usuario cuando entra en una ruta que no existe, evitando 
 * los problemas de inyección estática en las rutas.
 */
@Component({
  selector: 'app-page-not-found',
  standalone: true,
  template: ''
})
export class PageNotFoundComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
