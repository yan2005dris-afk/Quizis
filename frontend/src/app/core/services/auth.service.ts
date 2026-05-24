import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom, Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  sub: number;
  email: string;
  nombre: string;
  rolId: number;
  nombreRol: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly apiUrl = environment.apiUrl;

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  // Para manejar el estado del refresco y evitar bucles
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null,
  );

  constructor() {
    this.loadUserFromStorage();
  }

  getAccessToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }),
      );

      this.handleAuthSuccess(response);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Intenta refrescar el token de acceso.
   * El backend leerá la cookie 'refreshToken' automáticamente.
   */
  refreshToken(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/refresh`, {}).pipe(
      tap((response) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('accessToken', response.accessToken);
        }
      }),
    );
  }

  logout(): void {
    // Opcional: Llamar al endpoint de logout del backend para revocar en Redis
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next: () => this.clearLocalAuth(),
      error: () => this.clearLocalAuth(), // Limpiamos igual aunque falle el red
    });
  }

  private clearLocalAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(response: any): void {
    const user: User = {
      sub: response.sub,
      email: response.email,
      nombre: response.nombre,
      rolId: response.rolId,
      nombreRol: response.nombreRol,
      avatar: response.avatar,
    };

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    }

    this.user.set(user);
    this.isAuthenticated.set(true);
  }

  private loadUserFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (savedUser && token) {
        try {
          this.user.set(JSON.parse(savedUser));
          this.isAuthenticated.set(true);
        } catch (e) {
          console.error('Failed to parse saved user', e);
        }
      }
    }
  }
}
