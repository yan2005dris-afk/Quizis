import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatBoxComponent } from '../../chat-box/chat-box.component';
import { EventHeaderComponent } from '../../event-header/event-header.component';
import { EventFeedComponent } from '../../event-feed/event-feed.component';
import { ParticipantsIndexComponent } from '../../participants-index/participants-index.component';
import { ActiveQuestionComponent } from '../../active-question/active-question.component';
import { LucideAngularModule, Activity, Trophy, Users, MessageSquare, Send } from 'lucide-angular';

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ChatBoxComponent,
    EventHeaderComponent,
    EventFeedComponent,
    ParticipantsIndexComponent,
    ActiveQuestionComponent,
    LucideAngularModule,
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit, OnDestroy {
  protected readonly gameSocket = inject(GameSocketService);
  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<'publico' | 'chat'>('publico');

  // Iconos Lucide
  protected readonly LiveIcon = Activity;
  protected readonly TrophyIcon = Trophy;
  protected readonly UsersIcon = Users;
  protected readonly ChatIcon = MessageSquare;
  protected readonly SendIcon = Send;

  // Signals derivados para el template
  protected readonly preguntaActiva = this.gameSocket.preguntaActiva;
  protected readonly tiempoRestante = this.gameSocket.tiempoRestante;

  protected readonly opcionesAdaptadas = computed(() => {
    const p = this.preguntaActiva();
    if (!p) return [];
    return p.opciones.map((o) => ({
      id: o.opcionId.toString(),
      texto: o.texto,
      letra: o.letra,
    }));
  });

  protected readonly votosProcesados = computed(() => {
    const v = this.gameSocket.votosPublico();
    return v ?? { A: 0, B: 0, C: 0, D: 0, total: 0 };
  });

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      // Conectar con datos reales si hay sesión
      this.gameSocket.conectar('http://localhost:3000', 'token-temporal');
    }
  }

  ngOnDestroy(): void {
    this.gameSocket.desconectar();
  }

  protected onSeleccion(opcionId: string): void {
    console.log('Opción seleccionada por observador:', opcionId);
    // Aquí iría la lógica para emitir voto_observador si se requiere
  }

  protected onEnviarMensaje(event: { texto: string; tipo: 'mensaje' | 'sugerencia' }): void {
    this.gameSocket.enviarMensaje(event.texto, event.tipo);
  }
}
