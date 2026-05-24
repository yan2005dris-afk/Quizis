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
  template: `
    <div class="observer-room">
      <app-event-header
        [rondaInfo]="gameSocket.infoRonda()"
        [tiempoRestante]="gameSocket.tiempoRestante()"
        tituloEvento="Gran Torneo de Cultura General - Edición 2024"
      />

      <div class="observer-room__layout">
        <div class="observer-room__left">
          <app-main-screen />

          <p class="observer-room__footer-note">
            Estás viendo como observador — podés sugerir respuestas y chatear con la comunidad.
          </p>
        </div>

        <div class="observer-room__right">
          <div class="observer-room__tabs">
            <button
              class="observer-room__tab-btn"
              [class.observer-room__tab-btn--active]="activeTab() === 'publico'"
              (click)="activeTab.set('publico')"
            >
              Público ({{ gameSocket.participantes().length }})
            </button>
            <button
              class="observer-room__tab-btn"
              [class.observer-room__tab-btn--active]="activeTab() === 'chat'"
              (click)="activeTab.set('chat')"
            >
              Chat en Vivo
            </button>
          </div>

          <div class="observer-room__tab-content">
            @if (activeTab() === 'publico') {
              <app-event-feed [eventos]="gameSocket.eventosSala()" />
              <app-participants-list [participantes]="gameSocket.participantes()" />
            } @else {
              <app-chat-box
                [mensajes]="gameSocket.mensajesChat()"
                [conectado]="gameSocket.conectado()"
                (enviar)="onEnviarMensaje($event)"
              />
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f8fafc;
        min-height: 100%;
      }
      .observer-room {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .observer-room__layout {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .observer-room__left {
        flex: 0 0 70%;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .observer-room__right {
        flex: 0 0 calc(30% - 16px);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .observer-room__tabs {
        display: flex;
        gap: 0;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }
      .observer-room__tab-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        background: transparent;
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .observer-room__tab-btn:hover {
        background: #f1f5f9;
      }
      .observer-room__tab-btn--active {
        background: #eff6ff;
        color: #2563eb;
        font-weight: 700;
      }
      .observer-room__tab-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .observer-room__footer-note {
        margin: 0;
        font-size: 12px;
        color: #94a3b8;
        font-style: italic;
        padding: 4px 0;
      }
    `,
  ],
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
