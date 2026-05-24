import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { MainScreen } from '../../../proyector-juego/pages/main-screen/main-screen';
import { EventHeaderComponent } from '../../event-header/event-header.component';
import { EventFeedComponent } from '../../event-feed/event-feed.component';
import { ParticipantsListComponent } from '../../participants-list/participants-list.component';
import { ChatBoxComponent } from '../../chat-box/chat-box.component';

@Component({
  selector: 'app-observer-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MainScreen,
    EventHeaderComponent,
    EventFeedComponent,
    ParticipantsListComponent,
    ChatBoxComponent,
  ],
  templateUrl: './observer-room.component.html',
  styleUrl: './observer-room.component.scss',
})
export class ObserverRoomComponent implements OnInit, OnDestroy {
  protected readonly gameSocket = inject(GameSocketService);
  protected readonly activeTab = signal<'publico' | 'chat'>('publico');

  ngOnInit(): void {
    this.gameSocket.conectar('http://localhost:3000', 'token-temporal');
  }

  ngOnDestroy(): void {
    this.gameSocket.desconectar();
  }

  protected onEnviarMensaje(event: { texto: string; tipo: 'mensaje' | 'sugerencia' }): void {
    this.gameSocket.enviarMensaje(event.texto, event.tipo);
  }
}
