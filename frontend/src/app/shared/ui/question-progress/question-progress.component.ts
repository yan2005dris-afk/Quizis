import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-question-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-progress.component.html',
  styleUrl: './question-progress.component.scss',
})
export class QuestionProgressComponent {
  readonly segmentos = input<string[]>([]);
}
