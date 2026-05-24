import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChatMessage } from '../observer-room.types';

@Component({
  selector: 'app-chat-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="chat-box">
      <div class="chat-box__header">
        <h3 class="chat-box__title">Chat</h3>
        @if (!conectado()) {
          <span class="chat-box__offline" data-testid="offline-badge">Sin conexión</span>
        }
      </div>
      <div class="chat-box__messages">
        @if (mensajes().length > 0) {
          @for (msg of mensajes(); track msg.timestamp) {
            <div class="chat-box__message" data-testid="chat-message">
              <span class="chat-box__user">{{ msg.usuario }}</span>
              <span class="chat-box__text">{{ msg.texto }}</span>
              @if (msg.tipo === 'sugerencia') {
                <span class="chat-box__sugerencia">💡</span>
              }
            </div>
          }
        } @else {
          <p class="chat-box__empty">No hay mensajes</p>
        }
      </div>
      <div class="chat-box__input-row">
        <input
          class="chat-box__input"
          [class.chat-box__input--disabled]="!conectado()"
          data-testid="chat-input"
          [(ngModel)]="textoInput"
          placeholder="Escribí un mensaje..."
          (keyup.enter)="send()"
          [disabled]="!conectado()"
        />
        <button
          class="chat-box__send"
          [class.chat-box__send--disabled]="!conectado()"
          data-testid="send-button"
          (click)="send()"
          [disabled]="!conectado()"
        >
          Enviar
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-box {
        padding: 12px 16px;
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .chat-box__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .chat-box__title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      .chat-box__offline {
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        background: #fef2f2;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .chat-box__messages {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 200px;
        overflow-y: auto;
      }
      .chat-box__message {
        display: flex;
        gap: 8px;
        font-size: 13px;
        align-items: flex-start;
      }
      .chat-box__user {
        font-weight: 600;
        color: #2563eb;
        flex-shrink: 0;
      }
      .chat-box__text {
        color: #1e293b;
      }
      .chat-box__sugerencia {
        flex-shrink: 0;
        font-size: 12px;
      }
      .chat-box__empty {
        color: #94a3b8;
        font-style: italic;
        font-size: 13px;
        margin: 0;
      }
      .chat-box__input-row {
        display: flex;
        gap: 8px;
      }
      .chat-box__input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #f8fafc;
        color: #1e293b;
        font-size: 13px;
        transition: background 0.15s, border-color 0.15s;
      }
      .chat-box__input::placeholder {
        color: #94a3b8;
      }
      .chat-box__input--disabled {
        background: #f1f5f9;
        border-color: #e2e8f0;
        cursor: not-allowed;
      }
      .chat-box__send {
        padding: 8px 16px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;
      }
      .chat-box__send:hover:not(:disabled) {
        background: #1d4ed8;
      }
      .chat-box__send--disabled {
        background: #94a3b8;
        cursor: not-allowed;
        opacity: 0.6;
      }
    `,
  ],
})
export class ChatBoxComponent {
  readonly mensajes = input.required<ChatMessage[]>();
  readonly conectado = input(true);
  readonly enviar = output<{ texto: string; tipo: 'mensaje' | 'sugerencia' }>();

  protected textoInput = signal('');

  protected send(): void {
    const texto = this.textoInput().trim();
    if (!texto) return;
    this.enviar.emit({ texto, tipo: 'mensaje' });
    this.textoInput.set('');
  }
}
