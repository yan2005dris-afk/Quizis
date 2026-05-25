import { TestBed } from '@angular/core/testing';
import { KeepAliveService } from './keep-alive.service';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock localStorage for AuthService dependency
beforeEach(() => {
  const store: Record<string, string> = {};
  globalThis.localStorage ??= {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k in store) delete store[k];
    }),
    length: 0,
    key: vi.fn(() => null),
  };
});

describe('KeepAliveService', () => {
  let service: KeepAliveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        KeepAliveService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    });
    service = TestBed.inject(KeepAliveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service?.stop();
    // Flush any pending requests to not affect other tests
    const pending = httpMock?.match(() => true) ?? [];
    pending.forEach((req) => req.flush({}));

    httpMock?.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start pinging when start() is called', () => {
    service.start();

    // First ping
    // We use a small tick to trigger the timer(0)
    vi.advanceTimersByTime(100);

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });

    // Advance time by 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Second ping
    const req2 = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ status: 'ok' });
  });

  it('should handle errors silently', () => {
    service.start();

    vi.advanceTimersByTime(100);

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    req.error(new ProgressEvent('error'));

    // Should not throw and continue to next interval
    vi.advanceTimersByTime(5 * 60 * 1000);
    const req2 = httpMock.expectOne(`${environment.apiUrl}/health`);
    req2.flush({ status: 'ok' });
  });
});
