import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ActiveQuestionComponent } from './active-question.component';
import type { Pregunta, VotosPublico } from '../../../core/services/game-socket.service';

const preguntaMock: Pregunta = {
  preguntaId: 1,
  texto: '¿Cuál es la capital de Ecuador?',
  opciones: [
    { opcionId: 1, texto: 'Quito', letra: 'A' },
    { opcionId: 2, texto: 'Lima', letra: 'B' },
    { opcionId: 3, texto: 'Bogotá', letra: 'C' },
    { opcionId: 4, texto: 'Caracas', letra: 'D' },
  ],
  nivel: 1,
};

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

  it('should show waiting state when no pregunta is provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Esperando la siguiente pregunta');
  });

  it('should render the question text when provided', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('¿Cuál es la capital de Ecuador?');
  });

  it('should render the status text when pregunta is active', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('El encuestado está respondiendo');
  });

  it('should render 4 option cards when pregunta is provided', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="option-card"]');
    expect(cards.length).toBe(4);
  });

  it('should display option letters A, B, C, D', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('A');
    expect(el.textContent).toContain('B');
    expect(el.textContent).toContain('C');
    expect(el.textContent).toContain('D');
  });

  it('should render 3 wildcard buttons when pregunta is provided', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-publico"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-ia"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-llamada"]')).toBeTruthy();
  });

  it('should show 0% for all options when no votes yet', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.active-question__option-pct');
    expect(pcts.length).toBe(4);
    pcts.forEach((pct) => {
      expect(pct.textContent).toContain('0%');
    });
  });

  it('should update percentages when votes arrive', () => {
    const votos: VotosPublico = { A: 50, B: 30, C: 15, D: 5, total: 100 };
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.componentRef.setInput('votosPublico', votos);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.active-question__option-pct');
    expect(pcts[0].textContent).toContain('50%');
    expect(pcts[1].textContent).toContain('30%');
    expect(pcts[2].textContent).toContain('15%');
    expect(pcts[3].textContent).toContain('5%');
  });

  it('should mark publico wildcard as active when votosPublico is set', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.componentRef.setInput('votosPublico', { A: 10, B: 10, C: 10, D: 10, total: 40 });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('[data-testid="wildcard-publico"]') as HTMLElement;
    expect(btn.classList.contains('active-question__wildcard--active')).toBe(true);
  });

  it('should not depend on GameSocket connection — only needs inputs', () => {
    fixture.componentRef.setInput('pregunta', preguntaMock);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="option-card"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="wildcard-publico"]')).toBeTruthy();
  });
});
