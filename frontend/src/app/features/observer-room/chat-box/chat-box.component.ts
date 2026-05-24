import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChatMessage } from '../observer-room.types';

@Component({
  selector: 'app-chat-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-box.component.html',
  styleUrl: './chat-box.component.scss',
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
