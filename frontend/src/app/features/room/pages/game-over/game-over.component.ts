import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { LucideAngularModule, Trophy, Medal, Award, Star, Home, BarChart2 } from 'lucide-angular';
import { ReportesService } from '../../../../core/services/reportes.service';

export interface GameOverParticipant {
  nickname: string;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  porcentajeAcierto: number;
  comodinesUsados: string[];
  numeroRonda: number;
}

@Component({
  selector: 'app-game-over',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, SlicePipe, UpperCasePipe],
  templateUrl: './game-over.component.html',
  styleUrl: './game-over.component.scss',
})
export class GameOverComponent implements OnInit {
  /** ID de la sala para cargar estadísticas */
  readonly salaId = input.required<number>();
  readonly nombreSala = input<string>('Sala de Juego');

  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly TrophyIcon = Trophy;
  protected readonly MedalIcon = Medal;
  protected readonly AwardIcon = Award;
  protected readonly StarIcon = Star;
  protected readonly HomeIcon = Home;
  protected readonly ChartIcon = BarChart2;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly participants = signal<GameOverParticipant[]>([]);
  protected readonly revealed = signal(false);

  /** Top 3 ordenados por porcentaje de acierto */
  protected readonly podio = computed(() => {
    const sorted = [...this.participants()].sort(
      (a, b) => b.porcentajeAcierto - a.porcentajeAcierto,
    );
    return sorted.slice(0, 3);
  });

  /** Resto de participantes (puesto 4 en adelante) */
  protected readonly restantes = computed(() => {
    const sorted = [...this.participants()].sort(
      (a, b) => b.porcentajeAcierto - a.porcentajeAcierto,
    );
    return sorted.slice(3);
  });

  protected readonly promedioGlobal = computed(() => {
    const p = this.participants();
    if (!p.length) return 0;
    return Math.round(p.reduce((acc, x) => acc + x.porcentajeAcierto, 0) / p.length);
  });

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  private cargarEstadisticas(): void {
    this.reportesService.generarReporte(this.salaId()).subscribe({
      next: (data) => {
        // Consolidar por participante (puede tener múltiples rondas)
        const mapa = new Map<string, GameOverParticipant>();
        for (const ronda of data.rondas) {
          const existing = mapa.get(ronda.participanteNickname);
          if (existing) {
            existing.correctas += ronda.correctas;
            existing.incorrectas += ronda.incorrectas;
            existing.totalPreguntas += ronda.totalPreguntas;
            existing.comodinesUsados = [
              ...new Set([...existing.comodinesUsados, ...ronda.comodinesUsados]),
            ];
          } else {
            mapa.set(ronda.participanteNickname, { ...ronda });
          }
        }
        // Recalcular porcentaje consolidado
        const list: GameOverParticipant[] = [];
        mapa.forEach((p) => {
          p.porcentajeAcierto =
            p.totalPreguntas > 0 ? Math.round((p.correctas / p.totalPreguntas) * 100) : 0;
          list.push(p);
        });
        this.participants.set(list);
        this.loading.set(false);
        // Lanzar animación de reveal con delay
        setTimeout(() => this.revealed.set(true), 200);
      },
      error: () => {
        this.error.set('No se pudieron cargar los resultados.');
        this.loading.set(false);
      },
    });
  }

  protected onVerAnaliticas(): void {
    this.router.navigate(['/salas', this.salaId(), 'analiticas']);
  }

  protected onVolver(): void {
    this.router.navigate(['/salas']);
  }

  protected getMedallaSrc(puesto: number): string {
    const iconos = ['🥇', '🥈', '🥉'];
    return iconos[puesto] ?? '';
  }

  protected getHeightClass(puesto: number): string {
    const alturas = ['podio-1', 'podio-2', 'podio-3'];
    return alturas[puesto] ?? 'podio-3';
  }
}
