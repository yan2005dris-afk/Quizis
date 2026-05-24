import { TestBed } from '@angular/core/testing';
import { KeepAliveService } from './keep-alive.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('KeepAliveService', () => {
  let service: KeepAliveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [KeepAliveService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(KeepAliveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start pinging when start() is called', () => {
    service.start();

    // Trigger immediate timer emission
    vi.advanceTimersByTime(0);

    // First ping (timer starts at 0)
    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });

    // Advance time by 14 minutes
    vi.advanceTimersByTime(14 * 60 * 1000);

    // Second ping
    const req2 = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ status: 'ok' });

    service.stop();
  });

  it('should handle errors silently', () => {
    service.start();

    vi.advanceTimersByTime(0);

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    req.error(new ProgressEvent('error'));

    // Should not throw and continue to next interval
    vi.advanceTimersByTime(14 * 60 * 1000);
    const req2 = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req2).toBeTruthy();
    req2.flush({ status: 'ok' });

    service.stop();
  });
});
