import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoteTouchScreenComponent } from './vote-touch-screen.component';
import { ActivatedRoute } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { SocketService } from '../../../core/services/socket.service';
import { SalasService } from '../../../core/services/salas.service';

describe('VoteTouchScreenComponent', () => {
  beforeEach(async () => {
    const socketServiceStub = {
      connect: vi.fn(),
      unirseASala: vi.fn(),
      escucharEvento: vi.fn().mockReturnValue(EMPTY),
      emitirEvento: vi.fn(),
    };

    const salasServiceStub = {
      obtenerPorId: vi.fn().mockReturnValue(of({
        salaId: 1,
        rondaActiva: { rondaId: 1 }
      })),
    };

    await TestBed.configureTestingModule({
      imports: [VoteTouchScreenComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ token: 'TEST_TOKEN' }) },
        },
        { provide: SocketService, useValue: socketServiceStub },
        { provide: SalasService, useValue: salasServiceStub },
      ],
    }).compileComponents();
  });

  it('shows waiting card initially and enables buttons when question is released', () => {
    const fixture = TestBed.createComponent(VoteTouchScreenComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    let buttons = Array.from(element.querySelectorAll('.option-btn')) as HTMLButtonElement[];
    const waitingCard = element.querySelector('.waiting-card');

    // Inicialmente no debe haber botones de opción y se debe mostrar la pantalla de espera
    expect(buttons).toHaveLength(0);
    expect(waitingCard).not.toBeNull();

    window.dispatchEvent(
      new CustomEvent('quizis:question-released', {
        detail: {
          question: {
            prompt: 'Pregunta liberada',
            roundLabel: 'Ronda 1',
            opciones: [
              { id: 'A', texto: 'Opción A' },
              { id: 'B', texto: 'Opción B' },
              { id: 'C', texto: 'Opción C' },
              { id: 'D', texto: 'Opción D' }
            ]
          },
        },
      }),
    );

    fixture.detectChanges();

    buttons = Array.from(element.querySelectorAll('.option-btn')) as HTMLButtonElement[];

    // Al recibir la pregunta se oculta el estado de espera y aparecen los 4 botones habilitados
    expect(element.querySelector('.waiting-card')).toBeNull();
    expect(buttons).toHaveLength(4);
    expect(buttons.every((button) => !button.disabled)).toBe(true);
  });
});
