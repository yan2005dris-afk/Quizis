import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SegmentoProgreso = 'activa' | 'correcta' | 'incorrecta' | 'pendiente';

@Component({
  selector: 'app-question-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="question-progress" role="list" aria-label="Progreso de preguntas">
      @for (segmento of segmentos(); track $index) {
        <div
          class="question-progress__dot"
          [class.question-progress__dot--activa]="segmento === 'activa'"
          [class.question-progress__dot--correcta]="segmento === 'correcta'"
          [class.question-progress__dot--incorrecta]="segmento === 'incorrecta'"
          role="listitem"
          [attr.aria-label]="'Pregunta ' + ($index + 1) + ': ' + segmento"
        ></div>
      }
    </div>
  `,
  styles: [
    `
      .question-progress {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .question-progress__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--color-progress-pendiente, #4b5563);
        transition: background-color 0.2s ease;

        &--activa {
          background-color: var(--color-progress-activa, #3b82f6);
          width: 10px;
          height: 10px;
        }

        &--correcta {
          background-color: var(--color-progress-correcta, #22c55e);
        }

        &--incorrecta {
          background-color: var(--color-progress-incorrecta, #ef4444);
        }
      }
    `,
  ],
})
export class QuestionProgressComponent {
  readonly segmentos = input<SegmentoProgreso[]>([]);
}
