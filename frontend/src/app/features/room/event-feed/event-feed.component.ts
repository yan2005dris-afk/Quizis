import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SalaEvento } from '../room.types';

@Component({
  selector: 'app-event-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  templateUrl: './event-feed.component.html',
  styleUrl: './event-feed.component.scss',
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
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
