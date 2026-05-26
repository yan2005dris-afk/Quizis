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

    // Si no hay votos o el total es cero, retorna una lista vacía o las básicas
    if (!v || v.total === 0) {
      return [];
    }

    // Filtramos la propiedad 'total' y procesamos el resto de llaves dinámicamente
    return Object.keys(v)
      .filter((key) => key !== 'total')
      .sort()
      .map((letra) => {
        const votosOpcion = v[letra] ?? 0;
        return {
          letra,
          votos: votosOpcion,
          porcentaje: Math.round((votosOpcion / v.total) * 100),
        };
      });
  });
}
