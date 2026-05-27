import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../room.types';

@Component({
  selector: 'app-chat-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './chat-box.component.html',
  styleUrl: './chat-box.component.scss',
})
export class ChatBoxComponent {
  readonly mensajes = input.required<ChatMessage[]>();
  readonly conectado = input(true);
  readonly enviar = output<{ texto: string; tipo: 'mensaje' | 'sugerencia' }>();

  protected readonly mensajesContainer = viewChild<ElementRef>('messagesContainer');

  protected textoInput = signal('');

  constructor() {
    // Auto-scroll al último mensaje cuando cambia la lista
    effect((onCleanup) => {
      const msgs = this.mensajes();
      const container = this.mensajesContainer();

      if (container?.nativeElement && msgs.length > 0) {
        const id = setTimeout(() => {
          container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
        }, 0);
        onCleanup(() => clearTimeout(id));
      }
    });
  }

  protected send(): void {
    const texto = this.textoInput().trim();
    if (!texto) return;
    this.enviar.emit({ texto, tipo: 'mensaje' });
    this.textoInput.set('');
  }
}
