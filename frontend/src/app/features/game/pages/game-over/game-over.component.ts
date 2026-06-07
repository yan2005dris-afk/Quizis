import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import {
  LucideAngularModule,
  Trophy,
  Medal,
  Award,
  Star,
  Home,
  BarChart2,
  Play,
} from 'lucide-angular';
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

export type GameOverMode = 'round' | 'final';

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

  /** Modo: 'round' = podio de una ronda específica, 'final' = resumen de todas las rondas */
  readonly mode = input<GameOverMode>('final');

  /** Número de ronda a mostrar (solo para mode='round') */
  readonly rondaNumero = input<number>(1);

  /** Si es el admin/host (true) o un participante (false) */
  readonly isAdmin = input<boolean>(false);

  /** Emitido cuando el host quiere continuar con la siguiente ronda (solo mode='round') */
  readonly continuar = output<void>();

  /** Datos precalculados para el podio de ronda (modo round). Cuando se proveen, omite la llamada HTTP. */
  readonly roundData = input<GameOverParticipant[] | null>(null);

  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly TrophyIcon = Trophy;
  protected readonly MedalIcon = Medal;
  protected readonly AwardIcon = Award;
  protected readonly StarIcon = Star;
  protected readonly HomeIcon = Home;
  protected readonly ChartIcon = BarChart2;
  protected readonly PlayIcon = Play;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly participants = signal<GameOverParticipant[]>([]);
  protected readonly revealed = signal(false);

  protected readonly esModoRonda = computed(() => this.mode() === 'round');

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

  /** Subtítulo según el modo */
  protected readonly subtitulo = computed(() =>
    this.esModoRonda()
      ? `Resultados de la ronda ${this.rondaNumero()}`
      : 'Resultados finales de la sesión',
  );

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  private cargarEstadisticas(): void {
    if (this.esModoRonda() && this.roundData() !== null) {
      this.participants.set(this.roundData()!);
      this.loading.set(false);
      setTimeout(() => this.revealed.set(true), 200);
      return;
    }

    this.reportesService.generarReporte(this.salaId()).subscribe({
      next: (data) => {
        if (this.esModoRonda()) {
          // Modo ronda: mostrar solo los datos de la ronda específica
          const rondaData = data.rondas.find((r) => r.numeroRonda === this.rondaNumero());
          if (rondaData) {
            this.participants.set([
              {
                nickname: rondaData.participanteNickname,
                totalPreguntas: rondaData.totalPreguntas,
                correctas: rondaData.correctas,
                incorrectas: rondaData.incorrectas,
                porcentajeAcierto: rondaData.porcentajeAcierto,
                comodinesUsados: rondaData.comodinesUsados,
                numeroRonda: rondaData.numeroRonda,
              },
            ]);
          }
        } else {
          // Modo final: consolidar por participante (todas las rondas)
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
              mapa.set(ronda.participanteNickname, {
                nickname: ronda.participanteNickname,
                totalPreguntas: ronda.totalPreguntas,
                correctas: ronda.correctas,
                incorrectas: ronda.incorrectas,
                porcentajeAcierto: ronda.porcentajeAcierto,
                comodinesUsados: [...ronda.comodinesUsados],
                numeroRonda: ronda.numeroRonda,
              });
            }
          }
          const list: GameOverParticipant[] = [];
          mapa.forEach((p) => {
            p.porcentajeAcierto =
              p.totalPreguntas > 0 ? Math.round((p.correctas / p.totalPreguntas) * 100) : 0;
            list.push(p);
          });
          this.participants.set(list);
        }
        this.loading.set(false);
        setTimeout(() => this.revealed.set(true), 200);
      },
      error: () => {
        this.error.set('No se pudieron cargar los resultados.');
        this.loading.set(false);
      },
    });
  }

  protected onContinuar(): void {
    this.continuar.emit();
  }

  protected onVerAnaliticas(): void {
    this.router.navigate(['/salas', this.salaId(), 'analiticas']);
  }

  protected onVolver(): void {
    if (this.isAdmin()) {
      this.router.navigate(['/salas']);
    } else {
      this.router.navigate(['/login']);
    }
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
