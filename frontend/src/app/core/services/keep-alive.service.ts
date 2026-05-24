import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class KeepAliveService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private subscription?: Subscription;
  private readonly PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.subscription) {
      return;
    }

    this.subscription = timer(0, this.PING_INTERVAL).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.ping();
      }
    });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  private ping(): void {
    this.http
      .get(`${environment.apiUrl}/health`)
      .pipe(
        catchError((error) => {
          console.warn('Keep-alive ping failed', error);
          return of(null);
        }),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
