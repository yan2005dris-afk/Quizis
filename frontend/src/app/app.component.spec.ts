import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { KeepAliveService } from './core/services/keep-alive.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('AppComponent', () => {
  let mockKeepAliveService: { start: any; stop: any };
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    mockKeepAliveService = {
      start: vi.fn(),
      stop: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(AppComponent, {
        set: {
          providers: [{ provide: KeepAliveService, useValue: mockKeepAliveService }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start keep-alive service on init', () => {
    fixture.detectChanges();
    expect(mockKeepAliveService.start).toHaveBeenCalled();
  });
});
