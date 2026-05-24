import { inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KeepAliveService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private subscription?: Subscription;
  private readonly PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

  start(): void {
    if (this.subscription) {
      return;
    }

    // timer(initialDelay, period)
    this.subscription = timer(0, this.PING_INTERVAL).subscribe(() => {
      this.ping();
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
