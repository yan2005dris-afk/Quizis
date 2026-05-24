import { Component, signal } from '@angular/core';

export interface OpcionVoto {
  id: number;
  letra: string;
  texto: string;
  votos: number;
  porcentaje: number;
}

@Component({
  selector: 'app-active-question',
  templateUrl: './active-question.component.html',
  styleUrl: './active-question.component.scss',
})
export class ActiveQuestionComponent {
  readonly pregunta = signal('¿Cuál es la capital de Ecuador?');
  readonly opciones = signal<OpcionVoto[]>([
    { id: 1, letra: 'A', texto: 'Quito', votos: 0, porcentaje: 0 },
    { id: 2, letra: 'B', texto: 'Lima', votos: 0, porcentaje: 0 },
    { id: 3, letra: 'C', texto: 'Bogotá', votos: 0, porcentaje: 0 },
    { id: 4, letra: 'D', texto: 'Caracas', votos: 0, porcentaje: 0 },
  ]);
  readonly comodinPublicoActivo = signal(false);
  readonly comodinDisponible = signal(true);
}
