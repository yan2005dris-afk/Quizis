import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ActiveQuestionComponent } from './active-question.component';

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

  it('should render the question text', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('¿Cuál es la capital de Ecuador?');
  });

  it('should render the status text', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('El encuestado está pensando su respuesta');
  });

  it('should render 4 option cards', () => {
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="option-card"]');
    expect(cards.length).toBe(4);
  });

  it('should display option letters A, B, C, D', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('A');
    expect(el.textContent).toContain('B');
    expect(el.textContent).toContain('C');
    expect(el.textContent).toContain('D');
  });

  it('should render 3 wildcard buttons', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-publico"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-ia"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="wildcard-llamada"]')).toBeTruthy();
  });

  it('should show 0% for all options initially', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pcts = el.querySelectorAll('.active-question__option-pct');
    expect(pcts.length).toBe(4);
    pcts.forEach((pct) => {
      expect(pct.textContent).toContain('0%');
    });
  });

  it('should not depend on GameSocket connection — has own default data', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="option-card"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="wildcard-publico"]')).toBeTruthy();
  });
});
