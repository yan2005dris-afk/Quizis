import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { LucideAngularModule, Loader2 } from 'lucide-angular';
import { ComodinSala } from '../../../core/services/salas.service';

@Component({
  selector: 'app-wildcards-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, LucideAngularModule],
  templateUrl: './wildcards-panel.component.html',
  styleUrl: './wildcards-panel.component.scss',
})
export class WildcardsPanelComponent {
  readonly comodines = input<ComodinSala[]>([]);
  readonly cargandoIa = input<boolean>(false);
  readonly comodinPublicoActivo = input<boolean>(false);
  readonly interactive = input<boolean>(false);
  readonly comodinBloqueado = input<string[]>([]);

  readonly comodinClick = output<ComodinSala>();

  protected readonly LoaderIcon = Loader2;

  protected isComodinUsado(comodin: ComodinSala): boolean {
    return this.comodinBloqueado().includes(comodin.nombre);
  }

  protected getComodinEstadoTexto(comodin: ComodinSala): string {
    if (!comodin.activo) return 'Deshabilitado en la configuración';
    if (this.isComodinUsado(comodin)) return 'Usado en esta ronda';
    return 'Disponible';
  }

  protected onComodinClick(comodin: ComodinSala): void {
    this.comodinClick.emit(comodin);
  }
}
