import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { EventFeedComponent } from './event-feed.component';
import type { SalaEvento } from '../../room.types';

describe('EventFeedComponent', () => {
  let fixture: ComponentFixture<EventFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFeedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventFeedComponent);
  });

  it('should render a list of events with timestamps', () => {
    const eventos: SalaEvento[] = [
      { tipo: 'usuario_entra', mensaje: 'Alice entró a la sala', timestamp: 1000 },
      { tipo: 'inicio_pregunta', mensaje: 'Nueva pregunta lanzada', timestamp: 2000 },
      { tipo: 'voto', mensaje: 'Alice votó', timestamp: 3000 },
    ];
    fixture.componentRef.setInput('eventos', eventos);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="event-item"]');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Alice entró a la sala');
    expect(items[1].textContent).toContain('Nueva pregunta lanzada');
    expect(items[2].textContent).toContain('Alice votó');

    const times = fixture.nativeElement.querySelectorAll('[data-testid="event-time"]');
    expect(times).toHaveLength(3);
    expect(times[0].textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should show empty state when there are no events', () => {
    fixture.componentRef.setInput('eventos', []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No hay eventos');
  });
});
