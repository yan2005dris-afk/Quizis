import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export interface OpcionPregunta {
  id: string | number;
  texto: string;
}

@Component({
  selector: 'app-card-pregunta',
  standalone: true,
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

  // Flag que viene de main-screen para saber si acepta respuestas múltiples
  esMultiple = input<boolean>(false);

  // Output que avisa a main-screen cuando presionan "Confirmar Respuesta"
  confirmarRespuesta = output<OpcionPregunta[]>();

  // Guardamos las selecciones en un arreglo reactivo
  protected opcionesElegidasIds = signal<(string | number)[]>([]);

  // Lógica para saber si una opción está seleccionada actualmente
  protected estaSeleccionada(id: string | number): boolean {
    return this.opcionesElegidasIds().includes(id);
  }

  // Maneja el flujo de clicks según el tipo de pregunta
  protected alternarSeleccion(opcion: OpcionPregunta): void {
    if (this.bloqueado()) return;

    const seleccionadas = this.opcionesElegidasIds();

    if (this.esMultiple()) {
      // Si es múltiple, agregamos o removemos del arreglo
      if (seleccionadas.includes(opcion.id)) {
        this.opcionesElegidasIds.set(seleccionadas.filter((id) => id !== opcion.id));
      } else {
        this.opcionesElegidasIds.set([...seleccionadas, opcion.id]);
      }
    } else {
      // Si es de respuesta única, reemplazamos o desmarcamos si le da click de nuevo
      if (seleccionadas.includes(opcion.id)) {
        this.opcionesElegidasIds.set([]);
      } else {
        this.opcionesElegidasIds.set([opcion.id]);
      }
    }
  }

  // Generador automático de letras del alfabeto basado en el índice (A, B, C, D, E, F...)
  protected obtenerLetra(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Envía el paquete de opciones elegidas al componente padre
  protected enviarRespuesta(): void {
    if (this.opcionesElegidasIds().length === 0 || this.bloqueado()) return;

    // Filtramos los objetos completos de opciones correspondientes a los IDs seleccionados
    const opcionesFinales = this.opciones().filter((opc) =>
      this.opcionesElegidasIds().includes(opc.id),
    );

    this.confirmarRespuesta.emit(opcionesFinales);

    // Opcional: Limpiar la selección tras enviar para la siguiente ronda/pregunta
    this.opcionesElegidasIds.set([]);
  }
}
