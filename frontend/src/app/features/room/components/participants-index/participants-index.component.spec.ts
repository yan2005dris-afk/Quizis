import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ParticipantsIndexComponent } from './participants-index.component';
import type { Participante } from '../../room.types';

describe('ParticipantsIndexComponent', () => {
  let fixture: ComponentFixture<ParticipantsIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantsIndexComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ParticipantsIndexComponent);
  });

  it('should render a list of participants with scores', () => {
    const participantes: Participante[] = [
      { id: '1', nombre: 'Alice', puntaje: 100 },
      { id: '2', nombre: 'Bob', puntaje: 85 },
      { id: '3', nombre: 'Charlie', puntaje: 72 },
    ];
    fixture.componentRef.setInput('participantes', participantes);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="participant-item"]');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Alice');
    expect(items[0].textContent).toContain('100');
    expect(items[1].textContent).toContain('Bob');
    expect(items[1].textContent).toContain('85');
  });

  it('should show empty state when there are no participants', () => {
    fixture.componentRef.setInput('participantes', []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No hay participantes');
  });
});
