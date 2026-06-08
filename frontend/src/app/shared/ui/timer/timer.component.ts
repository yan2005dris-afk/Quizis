import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent {
  readonly tiempoRestante = input<number | null>(null);
  readonly totalTiempo = input<number>(30);
  readonly enTransicion = input<boolean>(false);
  readonly transicionSegundos = input<number | null>(null);
  readonly respondido = input<boolean>(false);

  protected readonly porcentaje = computed(() => {
    const t = this.tiempoRestante();
    const total = this.totalTiempo();
    if (t === null || total <= 0) return 100;
    return Math.max(0, Math.min(100, (t / total) * 100));
  });

  protected readonly urgente = computed(() => !this.respondido() && this.porcentaje() < 20);

  protected readonly advertencia = computed(() => {
    if (this.respondido()) return false;
    const p = this.porcentaje();
    return p >= 20 && p < 50;
  });

  protected readonly visible = computed(() => this.tiempoRestante() !== null);

  // stroke-dasharray = 100, so dashoffset = 100 - porcentaje empties the circle over time
  protected readonly strokeDashoffset = computed(() => 100 - this.porcentaje());
}
