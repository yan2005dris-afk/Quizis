import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Participante } from '../../room.types';

@Component({
  selector: 'app-participants-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants-index.component.html',
  styleUrl: './participants-index.component.scss',
})
export class ParticipantsIndexComponent {
  readonly participantes = input.required<Participante[]>();
}
