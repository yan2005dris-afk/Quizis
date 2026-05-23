import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VotosPublico } from '../../services/game-socket.service';

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
  template: `
  <div class="audience-bars">
    <!-- Genera una fila por cada opción (A, B, C, D) con su barra y porcentaje -->
    @for (barra of barras(); track barra.letra) {
      <div class="barra-row">
        <span class="letra">{{ barra.letra }}</span>
        <div class="barra-contenedor">
          <!-- El ancho se enlaza directamente al porcentaje calculado -->
          <div class="barra-relleno" [style.width.%]="barra.porcentaje"></div>
        </div>
        <span class="porcentaje">{{ barra.porcentaje }}%</span>
      </div>
    }
  </div>
  `,
  styles: `
  .audience-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .barra-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .letra {
    font-size: 1.2rem;
    font-weight: bold;
    width: 20px;
    color: white;
  }

  .barra-contenedor {
    flex: 1;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    height: 32px;
    overflow: hidden;
  }

  /* La transición hace que las barras se animen suavemente al cambiar los votos en tiempo real */
  .barra-relleno {
    height: 100%;
    background: #3b82f6;
    border-radius: 8px;
    transition: width 0.5s ease;
  }

  .porcentaje {
    font-size: 1rem;
    font-weight: bold;
    width: 40px;
    text-align: right;
    color: white;
  }
  `,
})

export class AudienceBars {
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
