import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { RondaInfo } from '../observer-room.types';

@Component({
  selector: 'app-event-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  templateUrl: './event-header.component.html',
  styleUrl: './event-header.component.scss',
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
