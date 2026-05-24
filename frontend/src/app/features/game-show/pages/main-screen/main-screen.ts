import { Component, signal } from '@angular/core';

import { CountdownComponent } from '../../../../shared/ui/countdown/countdown.component';
import {
  CardPreguntaComponent,
  OpcionPregunta
} from '../../../../shared/ui/card-pregunta/card-pregunta.component';

import { AlertComponent } from '../../../../shared/ui/alert/alert.component';

@Component({
  selector: 'app-main-screen',
  standalone: true,

  imports: [
    CountdownComponent,
    CardPreguntaComponent,
    AlertComponent
  ],

  templateUrl: './main-screen.html',
  styleUrl: './main-screen.scss',
})
export class MainScreen {

  pregunta = signal('¿Capital de Ecuador?');

  opciones = signal<OpcionPregunta[]>([
    { id: 1, texto: 'Quito' },
    { id: 2, texto: 'Lima' },
    { id: 3, texto: 'Bogotá' },
    { id: 4, texto: 'Caracas' },
  ]);

  mensaje = signal('');

  onTiempoAgotado() {
    this.mensaje.set('⏰ Tiempo agotado');
  }

  onSeleccion(opcion: OpcionPregunta) {
    console.log(opcion);

    if (opcion.texto === 'Quito') {
      this.mensaje.set('✅ Correcto');
    } else {
      this.mensaje.set('❌ Incorrecto');
    }
  }
}