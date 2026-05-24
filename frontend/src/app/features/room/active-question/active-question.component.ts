import { ChangeDetectionStrategy, Component, computed, input, signal, effect } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Pregunta, VotosPublico } from '../../../core/services/game-socket.service';
import { ComodinSala } from '../../../core/services/salas.service';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

export interface OpcionVoto {
  id: number;
  letra: string;
  texto: string;
  votos: number;
  porcentaje: number;
  esCorrecta?: boolean;
  fueElegida?: boolean;
}

@Component({
  selector: 'app-active-question',
  standalone: true,
  imports: [TitleCasePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './active-question.component.html',
  styleUrl: './active-question.component.scss',
})
export class ActiveQuestionComponent {
  readonly preguntaActivaId = input<number | null>(null);
  readonly preguntas = input<any[]>([]);
  readonly votosPublico = input<VotosPublico | null>(null);
  readonly comodinBloqueado = input<string | null>(null);
  readonly comodines = input<ComodinSala[]>([]);

  protected readonly currentIndex = signal(0);

  // Iconos
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;

  constructor() {
    // Sincronizar el índice cuando cambia la pregunta activa en el socket
    effect(() => {
      const activeId = this.preguntaActivaId();
      const list = this.preguntas();
      if (activeId && list.length > 0) {
        const index = list.findIndex((p) => p.preguntaId === activeId);
        if (index !== -1) {
          this.currentIndex.set(index);
        }
      }
    });
  }

  readonly preguntaMostrada = computed(() => {
    const list = this.preguntas();
    const idx = this.currentIndex();
    return list[idx] || null;
  });

  readonly opciones = computed<OpcionVoto[]>(() => {
    const p = this.preguntaMostrada();
    const v = this.votosPublico();
    const isViewingActive = p?.preguntaId === this.preguntaActivaId();

    if (!p) return [];

    return p.opciones.map((o: any) => {
      const votos = isViewingActive && v ? ((v as any)[o.letra] ?? 0) : 0;
      const total = isViewingActive && v ? v.total : 0;

      return {
        id: o.opcionId,
        letra: o.letra,
        texto: o.texto,
        votos,
        porcentaje: total > 0 ? Math.round((votos / total) * 100) : 0,
        fueElegida: p.respuestaDada?.opcionId === o.opcionId,
        // Nota: esCorrecta solo lo mostramos si ya fue contestada o el admin lo permite
        esCorrecta: p.respuestaDada
          ? p.respuestaDada.esCorrecta && p.respuestaDada.opcionId === o.opcionId
          : undefined,
      };
    });
  });

  readonly statusText = computed(() => {
    const p = this.preguntaMostrada();
    if (!p) return 'Esperando...';
    if (p.respuestaDada) return 'Pregunta contestada';
    if (p.preguntaId === this.preguntaActivaId()) return 'El encuestado está respondiendo...';
    return 'Pregunta pendiente';
  });

  readonly comodinPublicoActivo = computed(() => {
    const isViewingActive = this.preguntaMostrada()?.preguntaId === this.preguntaActivaId();
    return isViewingActive && this.votosPublico() !== null;
  });

  protected nextQuestion(): void {
    if (this.currentIndex() < this.preguntas().length - 1) {
      this.currentIndex.update((i) => i + 1);
    }
  }

  protected prevQuestion(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }
}
