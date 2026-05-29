import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';

@Component({
  selector: 'app-llamada-panel',
  standalone: true,
  imports: [ButtonComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './llamada-panel.component.html',
  styleUrl: './llamada-panel.component.scss',
})
export class LlamadaPanelComponent {
  protected readonly gameSocket = inject(GameSocketService);

  readonly interactive = input<boolean>(false);
  readonly mostrandoSelector = input<boolean>(false);
  readonly observadoresOnline = input<string[]>([]);
  readonly tokenCompartido = input<string>('');

  readonly consultorConfirmado = output<string>();
  readonly seleccionCancelada = output<void>();

  protected onConfirmar(nickname: string): void {
    this.consultorConfirmado.emit(nickname);
  }

  protected onCancelar(): void {
    this.seleccionCancelada.emit();
  }

  protected enviarSugerencia(letra: string): void {
    const pregunta = this.gameSocket.preguntaConsultor();
    const token = this.tokenCompartido();
    if (!pregunta || !token) return;

    this.gameSocket.enviarPistaConsultor(token, pregunta.preguntaId, letra);
    this.gameSocket.preguntaConsultor.set(null);
  }

  protected getMensajeAnuncio(consultor: string): string {
    return `${consultor} está ayudando al encuestado`;
  }

  protected getMensajePista(pista: string): string {
    return `El consultor sugiere la opción ${pista}`;
  }
}
