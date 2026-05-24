import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Participante } from '../observer-room.types';

@Component({
  selector: 'app-participants-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  templateUrl: './participants-list.component.html',
  styleUrl: './participants-list.component.scss',
})
export class ParticipantsListComponent {
  readonly participantes = input.required<Participante[]>();
}
