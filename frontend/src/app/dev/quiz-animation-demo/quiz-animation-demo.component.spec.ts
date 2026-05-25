import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizAnimationDemoComponent } from './quiz-animation-demo.component';

describe('QuizAnimationDemo', () => {
  let component: QuizAnimationDemoComponent;
  let fixture: ComponentFixture<QuizAnimationDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizAnimationDemoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizAnimationDemoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
