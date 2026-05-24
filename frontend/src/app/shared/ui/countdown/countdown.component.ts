import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.scss',
})
export class CountdownComponent implements OnDestroy {
  duracion = input.required<number>(); // segundos totales
  activo = input<boolean>(false);

  tiempoAgotado = output<void>();

  protected tiempoRestante = signal(0);

  protected porcentaje = computed(() => {
    const dur = this.duracion();
    return dur > 0 ? (this.tiempoRestante() / dur) * 100 : 0;
  });

  protected estadoClass = computed(() => {
    const p = this.porcentaje();
    if (p > 50) return 'countdown--ok';
    if (p > 25) return 'countdown--warning';
    return 'countdown--danger';
  });

  // SVG ring
  protected readonly radio = 44;
  protected readonly circunferencia = +(2 * Math.PI * 44).toFixed(3);

  protected dashOffset = computed(() => this.circunferencia * (1 - this.porcentaje() / 100));

  private intervalo?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      if (this.activo()) {
        this.tiempoRestante.set(this.duracion());
        this.iniciarIntervalo();
      } else {
        this.limpiarIntervalo();
      }
    });
  }

  private iniciarIntervalo(): void {
    this.limpiarIntervalo();
    this.intervalo = setInterval(() => {
      this.tiempoRestante.update((t) => {
        if (t <= 1) {
          this.limpiarIntervalo();
          this.tiempoAgotado.emit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  private limpiarIntervalo(): void {
    if (this.intervalo !== undefined) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }

  ngOnDestroy(): void {
    this.limpiarIntervalo();
  }
}
