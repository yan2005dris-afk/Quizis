import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { NgIf } from '@angular/common';

type VoteOptionKey = 'A' | 'B' | 'C' | 'D';

@Component({
  selector: 'app-vote-touch-screen',
  standalone: true,
  imports: [NgIf],
  templateUrl: './vote-touch-screen.component.html',
  styleUrls: ['./vote-touch-screen.component.scss'],
})
export class VoteTouchScreenComponent implements OnInit {
  protected readonly currentQuestion = signal<{ prompt: string } | null>(null);
  protected readonly selectedOption = signal<VoteOptionKey | null>(null);
  protected readonly canVote = computed(() => this.currentQuestion() !== null);

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    const onRelease = (ev: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (ev as any).detail;
      this.currentQuestion.set(detail?.question ?? { prompt: 'Pregunta' });
    };
    const onClose = () => {
      this.currentQuestion.set(null);
      this.selectedOption.set(null);
    };

    window.addEventListener('quizis:question-released', onRelease as EventListener);
    window.addEventListener('quizis:question-closed', onClose as EventListener);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('quizis:question-released', onRelease as EventListener);
      window.removeEventListener('quizis:question-closed', onClose as EventListener);
    });
  }

  protected selectOption(option: VoteOptionKey) {
    if (!this.canVote()) return;
    this.selectedOption.set(option);
    window.dispatchEvent(new CustomEvent('quizis:vote-casted', { detail: { option } }));
  }
}
