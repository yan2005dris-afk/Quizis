import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';

import { CountdownComponent } from '../../../../shared/ui/countdown/countdown.component';
import {
  CardPreguntaComponent,
  OpcionPregunta,
} from '../../../../shared/ui/card-pregunta/card-pregunta.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { AudienceBarsComponent } from '../../../../shared/ui/audience-bars/audience-bars.component';
import { GameSocketService } from '../../../../core/services/game-socket.service';

@Component({
  selector: 'app-main-screen',
  imports: [CountdownComponent, CardPreguntaComponent, AlertComponent, AudienceBarsComponent],
  templateUrl: './main-screen.html',
  styleUrl: './main-screen.scss',
})
export class MainScreen implements OnInit, OnDestroy {
  // Servicio WebSocket compartido: provee los votos del público en tiempo real
  readonly gameSocket = inject(GameSocketService);

  pregunta = signal('¿Capital de Ecuador?');

  opciones = signal<OpcionPregunta[]>([
    { id: 1, texto: 'Quito' },
    { id: 2, texto: 'Lima' },
    { id: 3, texto: 'Bogotá' },
    { id: 4, texto: 'Caracas' },
  ]);

  mensaje = signal('');
  comodinPublicoActivo = signal(false);

  onTiempoAgotado() {
    this.mensaje.set('⏰ Tiempo agotado');
  }

  onSeleccion(opcion: OpcionPregunta) {
    if (opcion.texto === 'Quito') {
      this.mensaje.set('✅ Correcto');
    } else {
      this.mensaje.set('❌ Incorrecto');
    }
  }
  ngOnInit() {
    this.gameSocket.conectar('http://localhost:3000', 'token-temporal');
  }

  ngOnDestroy() {
    this.gameSocket.desconectar();
  }
}
