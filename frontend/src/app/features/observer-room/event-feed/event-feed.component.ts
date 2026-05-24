import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SalaEvento } from '../observer-room.types';

@Component({
  selector: 'app-event-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="event-feed">
      <h3 class="event-feed__title">Eventos de la Sala</h3>
      @if (eventos().length > 0) {
        <div class="event-feed__list">
          @for (evento of eventos(); track evento.timestamp) {
            <div class="event-feed__item" data-testid="event-item">
              <span class="event-feed__type">{{ tipoIcono(evento.tipo) }}</span>
              <span class="event-feed__message">{{ evento.mensaje }}</span>
              <span class="event-feed__time" data-testid="event-time">{{ formatTime(evento.timestamp) }}</span>
            </div>
          }
        </div>
      } @else {
        <p class="event-feed__empty">No hay eventos</p>
      }
    </div>
  `,
  styles: [
    `
      .event-feed {
        padding: 12px 16px;
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
      }
      .event-feed__title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      .event-feed__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .event-feed__item {
        display: flex;
        gap: 8px;
        font-size: 13px;
        color: #64748b;
        align-items: center;
      }
      .event-feed__type {
        flex-shrink: 0;
      }
      .event-feed__message {
        color: #1e293b;
        flex: 1;
      }
      .event-feed__time {
        font-size: 11px;
        color: #94a3b8;
        flex-shrink: 0;
      }
      .event-feed__empty {
        color: #94a3b8;
        font-style: italic;
        font-size: 13px;
        margin: 0;
      }
    `,
  ],
})
export class EventFeedComponent {
  readonly eventos = input.required<SalaEvento[]>();

  protected tipoIcono(tipo: SalaEvento['tipo']): string {
    const iconos: Record<SalaEvento['tipo'], string> = {
      inicio_pregunta: '📝',
      voto: '🗳️',
      comodin: '🃏',
      usuario_entra: '➡️',
      usuario_sale: '⬅️',
    };
    return iconos[tipo] ?? '•';
  }

  protected formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
