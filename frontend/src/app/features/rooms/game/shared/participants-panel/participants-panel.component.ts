import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Participante } from '../../play.types';
import { LucideAngularModule, GraduationCap, Eye, Shield } from 'lucide-angular';

@Component({
  selector: 'app-participants-panel',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants-panel.component.html',
  styleUrl: './participants-panel.component.scss',
})
export class ParticipantsPanelComponent {
  readonly participantes = input.required<Participante[]>();
  readonly isHost = input<boolean>(false);
  readonly isEnVivo = input<boolean>(false);

  readonly toggleRol = output<{ nickname: string; nuevoRol: 'estudiante' | 'observador' }>();

  protected readonly AdminIcon = Shield;
  protected readonly StudentIcon = GraduationCap;
  protected readonly ObserverIcon = Eye;

  onToggleRol(participante: Participante) {
    if (this.isHost() && !this.isEnVivo() && participante.rol !== 'admin') {
      const nuevoRol = participante.rol === 'estudiante' ? 'observador' : 'estudiante';
      this.toggleRol.emit({ nickname: participante.nombre, nuevoRol });
    }
  }
}
