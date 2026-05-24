import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export interface OpcionPregunta {
  id: string | number;
  texto: string;
}

@Component({
  selector: 'app-card-pregunta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-pregunta.component.html',
  styleUrl: './card-pregunta.component.scss',
})
export class CardPreguntaComponent {
  pregunta = input.required<string>();
  opciones = input.required<OpcionPregunta[]>();
  numeroPregunta = input<number>(1);
  totalPreguntas = input<number>(1);
  bloqueado = input<boolean>(false);

  seleccionada = output<OpcionPregunta>();

  protected opcionElegidaId = signal<string | number | null>(null);
  protected readonly letras = ['A', 'B', 'C', 'D'];

  protected elegir(opcion: OpcionPregunta): void {
    if (this.bloqueado() || this.opcionElegidaId() !== null) return;
    this.opcionElegidaId.set(opcion.id);
    this.seleccionada.emit(opcion);
  }
}
