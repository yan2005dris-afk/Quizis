import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Participante } from '../observer-room.types';

@Component({
  selector: 'app-participants-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="participants-list">
      <h3 class="participants-list__title">Participantes</h3>
      @if (participantes().length > 0) {
        <div class="participants-list__grid">
          @for (p of participantes(); track p.id) {
            <div class="participants-list__item" data-testid="participant-item">
              <span class="participants-list__name">{{ p.nombre }}</span>
              <span class="participants-list__score">{{ p.puntaje }}</span>
            </div>
          }
        </div>
      } @else {
        <p class="participants-list__empty">No hay participantes</p>
      }
    </div>
  `,
  styles: [
    `
      .participants-list {
        padding: 12px 16px;
        background: var(--surface-card, #1e1e2e);
        border-radius: 8px;
        border: 1px solid var(--border-color, #313244);
      }
      .participants-list__title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #cdd6f4);
      }
      .participants-list__grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .participants-list__item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid var(--border-color, #313244);
      }
      .participants-list__name {
        font-size: 14px;
        color: var(--text-primary, #cdd6f4);
      }
      .participants-list__score {
        font-size: 14px;
        font-weight: 600;
        color: var(--accent-color, #f5c2e7);
      }
      .participants-list__empty {
        color: var(--text-secondary, #a6adc8);
        font-style: italic;
        font-size: 13px;
        margin: 0;
      }
    `,
  ],
})
export class ParticipantsListComponent {
  readonly participantes = input.required<Participante[]>();
}
