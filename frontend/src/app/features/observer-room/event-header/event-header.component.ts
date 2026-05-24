import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { RondaInfo } from '../observer-room.types';

@Component({
  selector: 'app-event-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="event-header">
      @if (rondaInfo(); as info) {
        <div class="event-header__badge-wrapper">
          <span class="event-header__live-badge">EN VIVO</span>
        </div>

        <div class="event-header__info">
          <h2 class="event-header__title">{{ tituloEvento() }}</h2>

          <div class="event-header__stats">
            <div class="event-header__timer">
              @if (tiempoRestante() !== null) {
                <span class="event-header__timer-value">{{ formattedTimer() }}</span>
              }
            </div>

            <div class="event-header__prize">
              <span class="event-header__prize-label">Premio:</span>
              <span class="event-header__prize-value">{{ info.premio }}</span>
            </div>

            <div class="event-header__progress">
              <span class="event-header__progress-text">
                Pregunta {{ info.ronda }} de {{ info.totalRondas }}
              </span>
            </div>
          </div>
        </div>
      } @else {
        <div class="event-header__waiting">
          <span>Esperando información de la ronda...</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .event-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }
      .event-header__badge-wrapper {
        flex-shrink: 0;
      }
      .event-header__live-badge {
        display: inline-block;
        padding: 4px 12px;
        background: #ef4444;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      .event-header__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .event-header__title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
      }
      .event-header__stats {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .event-header__timer-value {
        font-size: 20px;
        font-weight: 700;
        color: #2563eb;
        font-variant-numeric: tabular-nums;
      }
      .event-header__prize-label {
        font-size: 13px;
        color: #64748b;
        margin-right: 4px;
      }
      .event-header__prize-value {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
      }
      .event-header__progress-text {
        font-size: 13px;
        color: #64748b;
      }
      .event-header__waiting {
        color: #64748b;
        font-style: italic;
        padding: 8px 0;
      }
    `,
  ],
})
export class EventHeaderComponent {
  readonly rondaInfo = input<RondaInfo | null>(null);
  readonly tiempoRestante = input<number | null>(null);
  readonly tituloEvento = input<string>('');

  protected formattedTimer = computed(() => {
    const segundos = this.tiempoRestante();
    if (segundos === null || segundos === undefined) return '';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });
}
