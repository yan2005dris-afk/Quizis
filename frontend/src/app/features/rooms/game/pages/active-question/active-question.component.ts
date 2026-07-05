import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  effect,
  output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LucideAngularModule, ChevronLeft, ChevronRight, BrainCircuit } from 'lucide-angular';
import {
  AudienceBarsComponent,
  TimerComponent,
  QuestionProgressComponent,
  WildcardsPanelComponent,
} from '../../../../../shared/ui';
import { ComodinSala, SalasService } from '../../../services/salas.service';
import {
  GameSocketService,
  PreguntaHistorial,
} from '../../../../../core/services/game-socket.service';
import { ToastService } from '../../../../../core/services/toast.service';

export interface OpcionVoto {
  id: number;
  letra: string;
  texto: string;
  votos: number;
  porcentaje: number;
  esCorrecta?: boolean;
  fueElegida?: boolean;
  seleccionLocal?: boolean;
  estaPendiente?: boolean;
}

@Component({
  selector: 'app-active-question',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    AudienceBarsComponent,
    TimerComponent,
    QuestionProgressComponent,
    WildcardsPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './active-question.component.html',
  styleUrl: './active-question.component.scss',
})
export class ActiveQuestionComponent {
  private readonly salasService = inject(SalasService);
  protected readonly gameSocket = inject(GameSocketService);
  private readonly toastService = inject(ToastService);

  readonly preguntaActivaId = input<number | null>(null);
  readonly preguntas = input<PreguntaHistorial[]>([]);
  readonly tiempoRestante = input<number | null>(null);
  readonly totalTiempo = input<number>(30);
  readonly comodinBloqueado = input<string[]>([]);
  readonly comodines = input<ComodinSala[]>([]);
  readonly tokenCompartido = input<string>('');
  readonly interactive = input<boolean>(false);
  readonly isAdmin = input<boolean>(false);
  readonly seleccionada = output<number>();

  protected readonly currentIndex = signal(0);
  protected readonly localSelectedId = signal<number | null>(null);
  protected readonly respuestaConfirmada = signal(false);

  // IA State
  protected readonly iaSugerencia = signal<{ literal: string; explicacion: string } | null>(null);
  protected readonly cargandoIa = signal(false);

  // 50/50 State — derived from GameSocketService singleton (survives round restarts)
  protected readonly opcionesEliminadas = computed(() => this.gameSocket.opcionesEliminadas());

  protected readonly segmentosProgreso = computed(() =>
    this.preguntas().map((p) => {
      if (p.preguntaId === this.preguntaActivaId()) return 'activa';
      if (p.respuestaDada?.esCorrecta === true) return 'correcta';
      if (p.respuestaDada?.esCorrecta === false) return 'incorrecta';
      return 'pendiente';
    }),
  );

  // Iconos
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly IaIcon = BrainCircuit;

  constructor() {
    // Sincronizar el índice cuando cambia la pregunta activa en el socket
    effect(() => {
      const activeId = this.preguntaActivaId();
      const list = this.preguntas();

      if (!activeId) {
        this.iaSugerencia.set(null);
        this.localSelectedId.set(null);
        this.respuestaConfirmada.set(false);
        return;
      }

      if (list.length > 0) {
        const index = list.findIndex((p) => p.preguntaId === activeId);
        if (index !== -1) {
          this.currentIndex.set(index);
          this.localSelectedId.set(null);
          this.respuestaConfirmada.set(false);
          this.iaSugerencia.set(null);
        }
      }
    });

    // Escuchar comodin_bloqueado para 50/50 en tiempo real
    effect(() => {
      const bloqueado = this.gameSocket.ultimoComodinBloqueado();
      if (bloqueado && bloqueado.tipoComodin === '50_50' && bloqueado.preguntaId) {
        // If the current active question matches, update eliminated options in the service singleton
        if (bloqueado.preguntaId === this.preguntaActivaId()) {
          this.gameSocket.opcionesEliminadas.set(bloqueado.opcionesEliminadas ?? []);
        }
      }
    });

    // Clear 50/50 when round restarts (service signal is already cleared via WS event)

    // Reaccionar a re-voto solicitado por el servidor (sin mayoría en consenso de equipo)
    effect(() => {
      if (this.gameSocket.revotoSolicitado()) {
        this.respuestaConfirmada.set(false);
        this.localSelectedId.set(null);
        this.gameSocket.resetRevoto();
      }
    });

    // Reaccionar a respuestas en tiempo real vía socket
    effect(() => {
      const result = this.gameSocket.ultimoResultado();
      const activeId = this.preguntaActivaId();

      if (result && activeId === result.preguntaId) {
        // Actualizar la pregunta en el historial local para que las opciones reflejen la respuesta
        const list = [...this.preguntas()];
        const index = list.findIndex((p) => p.preguntaId === result.preguntaId);

        if (index !== -1 && !list[index].respuestaDada) {
          list[index].respuestaDada = {
            opcionId: this.localSelectedId() || result.opcionId || -1, // Intentar matchear con lo que eligió localmente
            esCorrecta: result.esCorrecta,
            feedback: result.feedback,
          };
          // Nota: Como 'preguntas' es un input, no podemos mutar la lista original de forma reactiva simple.
          // Pero las opciones se calculan en base a 'preguntaMostrada()', que lee de 'preguntas()'.
          // Si el Host no actualiza la prop 'preguntas', el componente hijo no se enterará.
          // CORRECCIÓN: El componente padre (GameSessionComponent) ya recibe el evento y debería actualizar la sala.
        }
      }
    });
  }

  readonly maxVisibleIndex = computed(() => {
    const list = this.preguntas();
    if (this.isAdmin()) return list.length - 1;

    const activeId = this.preguntaActivaId();

    // El público/estudiante solo puede ver hasta la pregunta activa o la última respondida
    let maxIdx = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].preguntaId === activeId || list[i].respuestaDada) {
        maxIdx = i;
      }
    }
    return maxIdx;
  });

  readonly preguntaMostrada = computed(() => {
    const list = this.preguntas();
    const idx = this.currentIndex();
    return list[idx] || null;
  });

  readonly opciones = computed<OpcionVoto[]>(() => {
    const p = this.preguntaMostrada();
    const v = this.gameSocket.votosPublico();
    const result = this.gameSocket.ultimoResultado();
    const isViewingActive = p?.preguntaId === this.preguntaActivaId();

    if (!p) return [];

    // Combinar datos del historial con el resultado en tiempo real del socket
    const respuestaDada =
      p.respuestaDada ||
      (isViewingActive && result && result.preguntaId === p.preguntaId ? result : null);

    return p.opciones.map((o) => {
      const votos = isViewingActive && v ? (v[o.letra] ?? 0) : 0;
      const total = isViewingActive && v ? v.total : 0;

      return {
        id: o.opcionId,
        letra: o.letra,
        texto: o.texto,
        votos,
        porcentaje: total > 0 ? Math.round((votos / total) * 100) : 0,
        fueElegida: respuestaDada?.opcionId === o.opcionId,
        seleccionLocal:
          !respuestaDada && !this.respuestaConfirmada() && this.localSelectedId() === o.opcionId,
        estaPendiente:
          !respuestaDada && this.respuestaConfirmada() && this.localSelectedId() === o.opcionId,
        // Highlight the correct option whenever the question is answered
        // (correct answer → the chosen option; incorrect answer → the
        // canonical correct option from p.opciones). Without this fix,
        // an incorrect or timed-out answer left NO option highlighted.
        esCorrecta: respuestaDada
          ? respuestaDada.esCorrecta
            ? respuestaDada.opcionId === o.opcionId
            : o.esCorrecta === true
          : undefined,
      };
    });
  });

  readonly statusText = computed(() => {
    const p = this.preguntaMostrada();
    const result = this.gameSocket.ultimoResultado();
    const isViewingActive = p?.preguntaId === this.preguntaActivaId();
    const respondida =
      p?.respuestaDada || (isViewingActive && result && result.preguntaId === p?.preguntaId);

    if (!p) return 'Esperando...';
    if (respondida) return 'Pregunta contestada';

    if (this.interactive() && isViewingActive) {
      if (this.respuestaConfirmada()) return 'Enviando respuesta...';
      if (this.localSelectedId()) return 'Tocá Confirmar para enviar';
      return 'Elegí una opción';
    }

    if (isViewingActive) {
      return 'El encuestado está respondiendo...';
    }
    return 'Pregunta pendiente';
  });

  readonly comodinPublicoActivo = computed(() => {
    const isViewingActive = this.preguntaMostrada()?.preguntaId === this.preguntaActivaId();
    return isViewingActive && this.gameSocket.votosPublico() !== null;
  });

  readonly showFeedback = computed(() => {
    const p = this.preguntaMostrada();
    if (!p) return false;
    const result = this.gameSocket.ultimoResultado();
    const isViewingActive = p.preguntaId === this.preguntaActivaId();
    return !!(p.respuestaDada || (isViewingActive && result && result.preguntaId === p.preguntaId));
  });

  readonly feedbackData = computed<{ esCorrecta: boolean; feedback: string } | null>(() => {
    const p = this.preguntaMostrada();
    if (!p) return null;
    const isViewingActive = p.preguntaId === this.preguntaActivaId();
    const result = this.gameSocket.ultimoResultado();
    const respuestaDada =
      p.respuestaDada ||
      (isViewingActive && result && result.preguntaId === p.preguntaId ? result : null);
    if (!respuestaDada) return null;
    return {
      esCorrecta: respuestaDada.esCorrecta,
      feedback: respuestaDada.esCorrecta
        ? p.feedbackCorrecto || respuestaDada.feedback || ''
        : p.feedbackIncorrecto || respuestaDada.feedback || '',
    };
  });

  protected nextQuestion(): void {
    if (this.currentIndex() < this.maxVisibleIndex()) {
      this.currentIndex.update((i) => i + 1);
    }
  }

  protected prevQuestion(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  protected onOpcionClick(opcionId: number): void {
    if (!this.interactive() || this.respuestaConfirmada() || this.preguntaMostrada()?.respuestaDada)
      return;
    this.localSelectedId.set(opcionId);
  }

  protected confirmar(): void {
    const opcionId = this.localSelectedId();
    if (opcionId === null) return;
    this.respuestaConfirmada.set(true);
    this.seleccionada.emit(opcionId);
  }

  protected onComodinClick(comodin: ComodinSala): void {
    // Guard 1: Already answered (confirmed via WS)
    if (this.respuestaConfirmada()) {
      this.toastService.show('Ya respondiste esta pregunta', 'warning', 'Atención');
      return;
    }

    // Guard 2: Race condition — answer submitted, WS not yet received
    const activeId = this.preguntaActivaId();
    const result = this.gameSocket.ultimoResultado();
    if (activeId && result?.preguntaId === activeId) {
      this.toastService.show('Ya respondiste esta pregunta', 'warning', 'Atención');
      return;
    }

    // Guard 3: Comodín not active or already used
    if (
      !this.interactive() ||
      !comodin.activo ||
      this.comodinBloqueado().includes(comodin.nombre)
    ) {
      return;
    }

    if (comodin.nombre === 'IA') {
      this.usarComodinIa();
    } else if (comodin.nombre === 'PUBLICO') {
      this.usarComodinPublico();
    } else if (comodin.nombre === 'LLAMADA') {
      this.usarComodinLlamada();
    } else if (comodin.nombre === '50_50') {
      this.usarComodin5050();
    }
  }

  protected usarComodinLlamada(): void {
    const token = this.tokenCompartido();
    const pregunta = this.preguntaMostrada();
    if (!token || !pregunta) return;

    console.log('[COMODIN:LLAMADA] Activando comodín de llamada...');
    this.gameSocket.activarComodinLlamada(token, pregunta);
  }

  protected usarComodinPublico(): void {
    const token = this.tokenCompartido();
    if (!token) return;

    console.log('[COMODIN:PUBLICO] Activando votación del público...');
    this.gameSocket.bloquearComodin(token, 'PUBLICO');
  }

  protected usarComodinIa(): void {
    const preguntaId = this.preguntaActivaId();
    const token = this.tokenCompartido();

    // Idempotencia: Si ya estamos cargando o ya tenemos la sugerencia, no hacer nada
    if (this.cargandoIa() || this.iaSugerencia()) return;

    if (!preguntaId || !token) {
      console.warn('[COMODIN:IA] Falta preguntaId o token para solicitar ayuda');
      return;
    }

    console.log(`[COMODIN:IA] Solicitando sugerencia para pregunta ${preguntaId}...`);
    this.cargandoIa.set(true);

    this.salasService.solicitarSugerenciaIa(preguntaId).subscribe({
      next: (res) => {
        console.log('[COMODIN:IA] Sugerencia recibida:', res);
        // Deduplication: if global already has this suggestion, don't show duplicate banner
        if (this.gameSocket.iaSugerenciaGlobal()?.literal === res.literal) {
          console.log('[COMODIN:IA] Sugerencia ya presente globalmente, omitiendo duplicado');
        } else {
          this.iaSugerencia.set(res);
        }
        this.cargandoIa.set(false);
        // Notificar a la sala para bloquear el uso (Broadcast)
        this.gameSocket.bloquearComodin(token, 'IA');
      },
      error: (err) => {
        console.error('[COMODIN:IA] Error al solicitar ayuda:', err);
        this.cargandoIa.set(false);
        this.toastService.show('No se pudo obtener la sugerencia de la IA', 'danger', 'Comodín IA');
      },
    });
  }

  protected usarComodin5050(): void {
    const preguntaId = this.preguntaActivaId();
    const token = this.tokenCompartido();

    if (!preguntaId || !token) {
      console.warn('[COMODIN:50_50] Falta preguntaId o token');
      return;
    }

    console.log(`[COMODIN:50_50] Eliminando opciones para pregunta ${preguntaId}...`);

    this.salasService.usarComodin5050(preguntaId).subscribe({
      next: (res) => {
        this.gameSocket.opcionesEliminadas.set(res.opcionesEliminadas);
        this.gameSocket.bloquearComodin(token, '50_50', res.opcionesEliminadas, preguntaId);
      },
      error: (err) => {
        console.error('[COMODIN:50_50] Error:', err);
      },
    });
  }
}
