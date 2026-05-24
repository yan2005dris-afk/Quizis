import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService, SalaResumen } from '../../../core/services/salas.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-salas-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="salas-list">
      <header class="salas-list__header">
        <h1 class="salas-list__title">Salas</h1>
        <p class="salas-list__subtitle">Todas las salas activas del sistema</p>
      </header>

      @if (loading()) {
        <div class="salas-list__loading" role="status">
          <div class="salas-list__spinner"></div>
          <span class="sr-only">Cargando salas...</span>
        </div>
      } @else if (error()) {
        <div class="salas-list__error" role="alert">
          <p>No se pudieron cargar las salas. Intenta de nuevo más tarde.</p>
        </div>
      } @else if (salas().length === 0) {
        <div class="salas-list__empty">
          <div class="salas-list__empty-icon">📋</div>
          <h2 class="salas-list__empty-title">No hay salas disponibles</h2>
          <p class="salas-list__empty-text">Aún no se ha creado ninguna sala. Cuando haya salas activas, aparecerán aquí.</p>
        </div>
      } @else {
        <div class="salas-list__grid">
          @for (sala of salas(); track sala.salaId) {
            <a class="sala-card" [routerLink]="['/sala', sala.salaId]">
              <div class="sala-card__header">
                <h3 class="sala-card__title">{{ sala.nombre }}</h3>
                @if (sala.estado === 'jugando') {
                  <span class="sala-card__badge sala-card__badge--vivo">EN VIVO</span>
                } @else if (sala.estado === 'esperando') {
                  <span class="sala-card__badge sala-card__badge--esperando">Esperando</span>
                } @else {
                  <span class="sala-card__badge sala-card__badge--terminado">Terminado</span>
                }
              </div>
              <div class="sala-card__meta">
                <span class="sala-card__participants">
                  {{ sala.participantes }} {{ sala.participantes === 1 ? 'participante' : 'participantes' }}
                </span>
                <span class="sala-card__date">
                  Creada el {{ sala.creadoEn | date:'dd/MM/yyyy' }}
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f8fafc;
        min-height: 100%;
        padding: 24px;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .salas-list__header {
        margin-bottom: 24px;
      }
      .salas-list__title {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
      }
      .salas-list__subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 4px 0 0;
      }
      .salas-list__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }

      /* Loading */
      .salas-list__loading {
        display: flex;
        justify-content: center;
        padding: 48px 0;
      }
      .salas-list__spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e2e8f0;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Error */
      .salas-list__error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 16px;
        color: #991b1b;
        font-size: 14px;
      }

      /* Empty */
      .salas-list__empty {
        text-align: center;
        padding: 64px 24px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }
      .salas-list__empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .salas-list__empty-title {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 8px;
      }
      .salas-list__empty-text {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }

      /* Card */
      .sala-card {
        display: block;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px;
        text-decoration: none;
        transition: box-shadow 0.15s, border-color 0.15s;
      }
      .sala-card:hover {
        border-color: #bfdbfe;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
      }
      .sala-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .sala-card__title {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
      }
      .sala-card__badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .sala-card__badge--vivo {
        background: #dcfce7;
        color: #166534;
      }
      .sala-card__badge--esperando {
        background: #fef9c3;
        color: #854d0e;
      }
      .sala-card__badge--terminado {
        background: #f1f5f9;
        color: #64748b;
      }
      .sala-card__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: #64748b;
      }
      .sala-card__participants {
        font-weight: 500;
      }
      .sala-card__date {
        color: #94a3b8;
      }
    `,
  ],
})
export class SalasListComponent implements OnInit {
  private readonly salasService = inject(SalasService);

  protected readonly salas = signal<SalaResumen[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.cargarSalas();
  }

  private cargarSalas(): void {
    this.loading.set(true);
    this.error.set(false);

    this.salasService.listarTodas().subscribe({
      next: (salas) => {
        // Ordenar: jugando primero, luego esperando, luego terminado
        const ordenEstado: Record<string, number> = {
          jugando: 0,
          esperando: 1,
          terminado: 2,
        };
        salas.sort((a, b) => (ordenEstado[a.estado] ?? 99) - (ordenEstado[b.estado] ?? 99));
        this.salas.set(salas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
