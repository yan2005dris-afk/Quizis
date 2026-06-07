import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { EventHeaderComponent } from './event-header.component';
import type { RondaInfo } from '../../play.types';

describe('EventHeaderComponent', () => {
  let fixture: ComponentFixture<EventHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventHeaderComponent);
  });

  it('should display EN VIVO badge, title, timer, prize and progress when rondaInfo is provided', () => {
    const rondaInfo: RondaInfo = { ronda: 3, totalRondas: 10, premio: '$5000' };
    fixture.componentRef.setInput('rondaInfo', rondaInfo);
    fixture.componentRef.setInput('tiempoRestante', 45);
    fixture.componentRef.setInput('tituloEvento', 'Gran Torneo de Cultura General - Edición 2024');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('EN VIVO');
    expect(el.textContent).toContain('Gran Torneo de Cultura General');
    expect(el.textContent).toContain('45');
    expect(el.textContent).toContain('$5000');
    expect(el.textContent).toContain('Pregunta 3');
    expect(el.textContent).toContain('de 10');
  });

  it('should display waiting message when rondaInfo is null', () => {
    fixture.componentRef.setInput('rondaInfo', null);
    fixture.componentRef.setInput('tiempoRestante', null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Esperando');
  });

  it('should show different round values and timer correctly', () => {
    const rondaInfo: RondaInfo = { ronda: 1, totalRondas: 1, premio: '$100' };
    fixture.componentRef.setInput('rondaInfo', rondaInfo);
    fixture.componentRef.setInput('tiempoRestante', 12);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('EN VIVO');
    expect(el.textContent).toContain('Pregunta 1');
    expect(el.textContent).toContain('de 1');
    expect(el.textContent).toContain('$100');
    expect(el.textContent).toContain('12');
  });

  it('should not show timer value when tiempoRestante is null', () => {
    const rondaInfo: RondaInfo = { ronda: 5, totalRondas: 8, premio: '$3000' };
    fixture.componentRef.setInput('rondaInfo', rondaInfo);
    fixture.componentRef.setInput('tiempoRestante', null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('EN VIVO');
    expect(el.textContent).toContain('Pregunta 5');
    // Should not show a numeric timer value
    expect(el.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
});
