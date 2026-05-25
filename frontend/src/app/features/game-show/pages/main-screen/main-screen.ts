import { Component, signal } from '@angular/core';
import { CardPreguntaComponent, OpcionPregunta } from '../../../../shared/ui/card-pregunta/card-pregunta.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';

@Component({
  selector: 'app-app-main-screen',
  standalone: true,
  imports: [
    CardPreguntaComponent,
    AlertComponent,
  ],
  templateUrl: './main-screen.html',
  styleUrl: './main-screen.scss',
})
export class MainScreen {

  pregunta = signal('¿Cuál es el lenguaje de programación principal utilizado para construir interfaces de usuario con React?');

  opciones = signal<(OpcionPregunta & { esCorrecta?: boolean })[]>([
    { id: 1, texto: 'Python', esCorrecta: false },
    { id: 2, texto: 'Java', esCorrecta: false },
    { id: 3, texto: 'JavaScript', esCorrecta: true },
    { id: 4, texto: 'C++', esCorrecta: false },
    { id: 5, texto: 'C--', esCorrecta: false },
    { id: 6, texto: 'C', esCorrecta: false },
    { id: 7, texto: 'XD?', esCorrecta: false },
    { id: 8, texto: 'Asd', esCorrecta: false },
  ]);

  esMultiple = signal(false); 
  mensaje = signal('');
  
  // Usamos <any> para que acepte tanto 'info', 'success' como 'error' sin que TypeScript salte con el error TS2345
  tipoMensaje = signal<any>('info'); 
  preguntaRespondida = signal(false);

  onConfirmarRespuesta(opcionesSeleccionadas: OpcionPregunta[]) {
    if (opcionesSeleccionadas.length === 0 || this.preguntaRespondida()) return;

    // Bloqueamos la pantalla para que no siga marcando opciones
    this.preguntaRespondida.set(true);

    if (this.esMultiple()) {
      // Lógica para preguntas múltiples
      const todasCorrectas = opcionesSeleccionadas.every(op => 
        this.opciones().find(o => o.id === op.id)?.esCorrecta
      );
      
      if (todasCorrectas) {
        this.tipoMensaje.set('success');
        this.mensaje.set('✨ ¡Excelente! Has seleccionado todas las opciones correctas.');
      } else {
        const correctas = this.opciones().filter(o => o.esCorrecta).map(o => o.texto).join(', ');
        this.tipoMensaje.set('error');
        this.mensaje.set(`❌ Respuesta incorrecta. Las opciones correctas eran: ${correctas}`);
      }
    } else {
      // Lógica para pregunta única
      const seleccionada = opcionesSeleccionadas[0];
      const esCorrecta = this.opciones().find(o => o.id === seleccionada.id)?.esCorrecta;

      if (esCorrecta) {
        this.tipoMensaje.set('success');
        this.mensaje.set('🎉 ¡Respuesta correcta! ¡Buen trabajo!');
      } else {
        // Buscamos cuál era la respuesta correcta para el feedback dinámico
        const respuestaCorrecta = this.opciones().find(o => o.esCorrecta)?.texto || '';
        this.tipoMensaje.set('error');
        this.mensaje.set(`❌ Respuesta incorrecta. La opción correcta es: ${respuestaCorrecta}`);
      }
    }
  }

  usarComodin(tipo: 'publico' | 'ia' | 'llamada') {
    if (this.preguntaRespondida()) return;
    console.log(`Comodín usado: ${tipo}`);
  }
}