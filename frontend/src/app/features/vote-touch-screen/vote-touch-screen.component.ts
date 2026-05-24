import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';

type VoteOptionKey = 'A' | 'B' | 'C' | 'D';

interface LiveQuestion {
  prompt: string;
  roundLabel?: string;
  subtitle?: string;
}

interface QuestionReleasedDetail {
  question: LiveQuestion;
}

interface VoteOption {
  key: VoteOptionKey;
  hint: string;
}

const QUESTION_RELEASED_EVENT = 'quizis:question-released';
const QUESTION_CLOSED_EVENT = 'quizis:question-closed';

const VOTE_OPTIONS: readonly VoteOption[] = [
  { key: 'A', hint: 'Primera opción' },
  { key: 'B', hint: 'Segunda opción' },
  { key: 'C', hint: 'Tercera opción' },
  { key: 'D', hint: 'Cuarta opción' },
] as const;

@Component({
  selector: 'app-vote-touch-screen',
  standalone: true,
  imports: [],
  templateUrl: './vote-touch-screen.component.html',
  styleUrl: './vote-touch-screen.component.scss',
})
export class VoteTouchScreenComponent implements OnInit {
  protected readonly voteOptions = VOTE_OPTIONS;
  protected readonly currentQuestion = signal<LiveQuestion | null>(null);
  protected readonly selectedOption = signal<VoteOptionKey | null>(null);
  protected readonly canVote = computed(() => this.currentQuestion() !== null);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly handleQuestionReleased = (event: Event) => {
    const detail = (event as CustomEvent<QuestionReleasedDetail>).detail;

    if (!detail?.question?.prompt.trim()) {
      return;
    }

    this.currentQuestion.set(detail.question);
    this.selectedOption.set(null);
  };

  private readonly handleQuestionClosed = () => {
    this.currentQuestion.set(null);
    this.selectedOption.set(null);
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.addEventListener(QUESTION_RELEASED_EVENT, this.handleQuestionReleased);
    window.addEventListener(QUESTION_CLOSED_EVENT, this.handleQuestionClosed);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener(QUESTION_RELEASED_EVENT, this.handleQuestionReleased);
      window.removeEventListener(QUESTION_CLOSED_EVENT, this.handleQuestionClosed);
    });
  }

  protected selectOption(option: VoteOptionKey): void {
    if (!this.canVote()) {
      return;
    }

    this.selectedOption.set(option);
  }
}
