import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { GameSessionComponent } from './game-session.component';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import type { RondaInfo, Participante } from '../../game.types';

describe('GameSessionComponent', () => {
  let fixture: ComponentFixture<GameSessionComponent>;
  let gameSocket: GameSocketService;

  beforeEach(async () => {
    // Mock localStorage for AuthService constructor
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          /* Mock implementation for testing purposes */
        },
        removeItem: () => {
          /* Mock implementation for testing purposes */
        },
      },
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [GameSessionComponent],
      providers: [
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '1',
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameSessionComponent);
    gameSocket = TestBed.inject(GameSocketService);
  });

  it('should render EventHeader in the top section', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-event-header')).toBeTruthy();
  });

  it('should embed app-active-question in the left (70%) column', () => {
    (fixture.componentInstance as any).salaDetalle.set({
      salaId: 1,
      nombre: 'Test Sala',
      estado: 'EN_VIVO',
      tokenCompartido: 'test-token',
      rondaActiva: {
        rondaId: 1,
        preguntaActualId: 1,
        historialPreguntas: [],
        preguntaActual: null,
      },
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-active-question')).toBeTruthy();
  });

  it('should render right column with publico and chat tab buttons', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('.room__tab-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Participantes');
    expect(buttons[1].textContent).toContain('Chat en Vivo');
  });

  it('should show EventFeed and ParticipantsList when publico tab is active', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-event-feed')).toBeTruthy();
    // In our new structure, it's ParticipantsPanelComponent but selector is app-participants-panel
    expect(el.querySelector('app-participants-panel')).toBeTruthy();
    expect(el.querySelector('app-chat-box')).toBeFalsy();
  });

  it('should show ChatBox when chat tab is clicked', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const chatTab = el.querySelectorAll('.room__tab-btn')[1] as HTMLButtonElement;
    chatTab.click();
    fixture.detectChanges();

    expect(el.querySelector('app-chat-box')).toBeTruthy();
    expect(el.querySelector('app-event-feed')).toBeFalsy();
  });

  it('should render data from GameSocketService signals in child components', () => {
    const rondaInfo: RondaInfo = { ronda: 2, totalRondas: 8, premio: '$2000' };
    gameSocket.infoRonda.set(rondaInfo);

    const participantes: Participante[] = [
      { id: '1', nombre: 'Alice', puntaje: 100, rol: 'observador' },
    ];
    gameSocket.participantes.set(participantes);

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pregunta 2');
    expect(el.textContent).toContain('de 8');
    expect(el.textContent).toContain('$2000');
    expect(el.textContent).toContain('Alice');
  });

  it('should display observer footer note', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Estás participando en la sala');
  });
});
