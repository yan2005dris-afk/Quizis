import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VotosPublico } from '../../../core/services/game-socket.service';

// Estructura interna que representa una barra ya procesada con su porcentaje calculado
interface BarraVoto {
  letra: string;
  votos: number;
  porcentaje: number;
}

@Component({
  selector: 'app-audience-bars',
  // OnPush: el componente solo se re-renderiza cuando su input cambia, no en cada ciclo de Angular
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './audience-bars.component.html',
  styleUrl: './audience-bars.component.scss',
})
export class AudienceBarsComponent {
  // Recibe los votos desde el componente padre; null si el comodín aún no fue activado
  votos = input<VotosPublico | null>(null);

  // Recalcula los porcentajes automáticamente cada vez que el input de votos cambia
  barras = computed<BarraVoto[]>(() => {
    const v = this.votos();

    // Si no hay votos o el total es cero, retorna las barras vacías para evitar división por cero
    if (!v || v.total === 0) {
      return [
        { letra: 'A', votos: 0, porcentaje: 0 },
        { letra: 'B', votos: 0, porcentaje: 0 },
        { letra: 'C', votos: 0, porcentaje: 0 },
        { letra: 'D', votos: 0, porcentaje: 0 },
      ];
    }

    // Convierte los votos crudos a porcentajes redondeados sobre el total de votos recibidos
    return [
      { letra: 'A', votos: v.A, porcentaje: Math.round((v.A / v.total) * 100) },
      { letra: 'B', votos: v.B, porcentaje: Math.round((v.B / v.total) * 100) },
      { letra: 'C', votos: v.C, porcentaje: Math.round((v.C / v.total) * 100) },
      { letra: 'D', votos: v.D, porcentaje: Math.round((v.D / v.total) * 100) },
    ];
  });
}
