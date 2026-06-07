import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ParticipantsPanelComponent } from './participants-panel.component';
import type { Participante } from '../../game.types';

describe('ParticipantsPanelComponent', () => {
  let fixture: ComponentFixture<ParticipantsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ParticipantsPanelComponent);
  });

  it('should render a list of participants with their visible roles', () => {
    const participantes: Participante[] = [
      { id: '1', nombre: 'Alice', puntaje: 100, rol: 'estudiante' },
      { id: '2', nombre: 'Bob', puntaje: 85, rol: 'observador' },
      { id: '3', nombre: 'Charlie', puntaje: 72, rol: 'admin' },
    ];
    fixture.componentRef.setInput('participantes', participantes);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="participant-item"]');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Alice');
    expect(items[0].textContent).toContain('Estudiante');
    expect(items[1].textContent).toContain('Bob');
    expect(items[1].textContent).toContain('Observador');
    expect(items[2].textContent).toContain('Charlie');
    expect(items[2].textContent).toContain('Admin');
  });

  it('should show empty state when there are no participants', () => {
    fixture.componentRef.setInput('participantes', []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nadie conectado aún');
  });
});
