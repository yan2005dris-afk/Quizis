import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActiveQuestionComponent } from './active-question.component';
import { GameSocketService, VotosPublico } from '../../../../../core/services/game-socket.service';
import { ToastService } from '../../../../../core/services/toast.service';

const preguntasMock = [
  {
    preguntaId: 1,
    texto: '¿Cuál es la capital de Ecuador?',
    opciones: [
      { opcionId: 1, texto: 'Quito', letra: 'A' },
      { opcionId: 2, texto: 'Lima', letra: 'B' },
      { opcionId: 3, texto: 'Bogotá', letra: 'C' },
      { opcionId: 4, texto: 'Caracas', letra: 'D' },
    ],
    nivel: 1,
    respuestaDada: null,
  },
];

describe('ActiveQuestionComponent', () => {
  let component: ActiveQuestionComponent;
  let fixture: ComponentFixture<ActiveQuestionComponent>;

  let mockVotosPublico: ReturnType<typeof signal<VotosPublico | null>>;
  let mockOpcionesEliminadas: ReturnType<typeof signal<number[]>>;
  let mockUltimoResultado: ReturnType<typeof signal<any>>;
  let mockToastService: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockVotosPublico = signal<VotosPublico | null>(null);
    mockOpcionesEliminadas = signal<number[]>([]);
    mockUltimoResultado = signal(null);
    mockToastService = { show: vi.fn() };

    const mockGameSocket = {
      votosPublico: mockVotosPublico,
      ultimoResultado: mockUltimoResultado,
      ultimoComodinBloqueado: signal<any>(null),
      opcionesEliminadas: mockOpcionesEliminadas,
      votantesConfirmados: signal<number>(0),
      totalVotantesRequeridos: signal<number>(0),
      esperandoConsenso: signal<boolean>(false),
      revotoSolicitado: signal<boolean>(false),
      resetRevoto: vi.fn(),
    } as unknown as GameSocketService;

    await TestBed.configureTestingModule({
      imports: [ActiveQuestionComponent],
      providers: [
        { provide: GameSocketService, useValue: mockGameSocket },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveQuestionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show waiting state when no questions are provided', () => {
    fixture.componentRef.setInput('preguntas', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sincronizando con el servidor');
  });

  it('should render the question text when provided', () => {
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('¿Cuál es la capital de Ecuador?');
  });

  it('should render the status text when current question is active', () => {
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('El encuestado está respondiendo');
  });

  it('should render 4 option cards when 4 options are provided', () => {
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="option-card"]');
    expect(cards.length).toBe(4);
  });

  it('should display option letters A, B, C, D', () => {
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('A');
    expect(el.textContent).toContain('B');
    expect(el.textContent).toContain('C');
    expect(el.textContent).toContain('D');
  });

  it('should show 0% for all options when no votes yet', () => {
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.option-item__percentage');
    pcts.forEach((pct) => {
      expect(pct.textContent).toBe('');
    });
  });

  it('should update percentages when votes arrive', () => {
    const votos: VotosPublico = { A: 50, B: 30, C: 15, D: 5, total: 100 };
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    mockVotosPublico.set(votos);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.option-item__percentage');

    expect(pcts.length).toBe(4);
    expect(pcts[0].textContent).toContain('50%');
    expect(pcts[1].textContent).toContain('30%');
    expect(pcts[2].textContent).toContain('15%');
    expect(pcts[3].textContent).toContain('5%');
  });

  it('should mark publico wildcard as active when votosPublico is set and viewing active question', () => {
    const comodinesMock = [{ nombre: 'PUBLICO', descripcion: 'test', icono: '👥', activo: true }];
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.componentRef.setInput('comodines', comodinesMock);
    mockVotosPublico.set({ A: 10, B: 10, C: 10, D: 10, total: 40 });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.wildcard-node--active');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Publico');
  });

  it('should allow navigating between questions', () => {
    const multiplePreguntas = [
      ...preguntasMock,
      {
        preguntaId: 2,
        texto: 'Segunda Pregunta',
        opciones: [{ opcionId: 5, texto: 'Op 1', letra: 'A' }],
        nivel: 2,
        respuestaDada: null,
      },
    ];
    fixture.componentRef.setInput('preguntas', multiplePreguntas);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.componentRef.setInput('isAdmin', true); // Permitir navegación como admin
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¿Cuál es la capital de Ecuador?');

    component['nextQuestion']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Segunda Pregunta');
    expect(fixture.nativeElement.textContent).toContain('2 / 2');
  });

  // ─── BUG 4: Comodín blocking on already-answered questions ──────────

  describe('Bug 4 — comodín blocking guards', () => {
    it('should show toast when respuestaConfirmada is true', () => {
      // Set up with a single comodín
      const comodinesMock = [
        { comodinId: 1, nombre: 'IA', descripcion: 'test', icono: '🤖', activo: true },
      ];
      fixture.componentRef.setInput('comodines', comodinesMock);
      fixture.componentRef.setInput('preguntas', preguntasMock);
      fixture.componentRef.setInput('preguntaActivaId', 1);
      fixture.componentRef.setInput('interactive', true);
      fixture.detectChanges();

      // Simulate answer confirmed
      component['respuestaConfirmada'].set(true);
      fixture.detectChanges();

      // Click comodín — should trigger toast, not call usarComodinIa
      component['onComodinClick'](comodinesMock[0]);

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Ya respondiste esta pregunta',
        'warning',
        'Atención',
      );
    });

    it('should show toast when ultimoResultado has matching preguntaId (race condition)', () => {
      const comodinesMock = [
        { comodinId: 2, nombre: '50_50', descripcion: 'test', icono: '5', activo: true },
      ];
      fixture.componentRef.setInput('comodines', comodinesMock);
      fixture.componentRef.setInput('preguntas', preguntasMock);
      fixture.componentRef.setInput('preguntaActivaId', 1);
      fixture.componentRef.setInput('interactive', true);
      fixture.detectChanges();

      // Simulate answer result already received via WS (race condition guard)
      mockUltimoResultado.set({ preguntaId: 1, opcionId: 2, esCorrecta: true, feedback: 'ok' });
      fixture.detectChanges();

      component['onComodinClick'](comodinesMock[0]);

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Ya respondiste esta pregunta',
        'warning',
        'Atención',
      );
    });

    it('should show toast when ultimoResultado has matching preguntaId (race condition)', () => {
      const comodinesMock = [
        { comodinId: 2, nombre: '50_50', descripcion: 'test', icono: '5', activo: true },
      ];
      fixture.componentRef.setInput('comodines', comodinesMock);
      fixture.componentRef.setInput('preguntas', preguntasMock);
      fixture.componentRef.setInput('preguntaActivaId', 1);
      fixture.componentRef.setInput('interactive', true);
      fixture.detectChanges();

      // Simulate answer result already received via WS (race condition guard)
      mockUltimoResultado.set({ preguntaId: 1, opcionId: 2, esCorrecta: true, feedback: 'ok' });
      fixture.detectChanges();

      component['onComodinClick'](comodinesMock[0]);

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Ya respondiste esta pregunta',
        'warning',
        'Atención',
      );
    });
  });
});
