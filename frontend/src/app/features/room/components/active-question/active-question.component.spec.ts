import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ActiveQuestionComponent } from './active-question.component';
import type { VotosPublico } from '../../../core/services/game-socket.service';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveQuestionComponent],
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
    expect(fixture.nativeElement.textContent).toContain('Cargando preguntas');
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
    const pcts = el.querySelectorAll('.active-question__option-pct');
    pcts.forEach((pct) => {
      // In the new component, we only show % if > 0 in the template
      // Let's check the code: @if (opcion.porcentaje > 0) { ... }
      // So we expect 0 matches or empty strings if we don't pass votes
      expect(pct.textContent).toBe('');
    });
  });

  it('should update percentages when votes arrive', () => {
    const votos: VotosPublico = { A: 50, B: 30, C: 15, D: 5, total: 100 };
    fixture.componentRef.setInput('preguntas', preguntasMock);
    fixture.componentRef.setInput('preguntaActivaId', 1);
    fixture.componentRef.setInput('votosPublico', votos);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.active-question__option-pct');
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
    fixture.componentRef.setInput('votosPublico', { A: 10, B: 10, C: 10, D: 10, total: 40 });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '.active-question__wildcard--active',
    ) as HTMLElement;
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
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¿Cuál es la capital de Ecuador?');

    component['nextQuestion']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Segunda Pregunta');
    expect(fixture.nativeElement.textContent).toContain('2 / 2');
  });
});
