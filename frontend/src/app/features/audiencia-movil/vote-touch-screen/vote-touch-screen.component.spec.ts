import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VoteTouchScreenComponent } from './vote-touch-screen.component';

describe('VoteTouchScreenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoteTouchScreenComponent],
    }).compileComponents();
  });

  it('keeps buttons disabled until the question is released', () => {
    const fixture = TestBed.createComponent(VoteTouchScreenComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('button')) as HTMLButtonElement[];

    expect(buttons).toHaveLength(4);
    expect(buttons.every((button) => button.disabled)).toBe(true);

    window.dispatchEvent(
      new CustomEvent('quizis:question-released', {
        detail: {
          question: {
            prompt: 'Pregunta liberada',
            roundLabel: 'Ronda 1',
          },
        },
      }),
    );

    fixture.detectChanges();

    expect(buttons.every((button) => !button.disabled)).toBe(true);
  });
});
