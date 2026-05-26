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
import { CommonModule, TitleCasePipe } from '@angular/common';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { SalasService, ComodinSala } from '../../../../core/services/salas.service';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Loader2,
} from 'lucide-angular';
import { AudienceBarsComponent } from '../../../../shared/ui';

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
    TitleCasePipe,
    LucideAngularModule,
    AudienceBarsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './active-question.component.html',
  styleUrl: './active-question.component.scss',
})
export class ActiveQuestionComponent {
  private readonly salasService = inject(SalasService);
  protected readonly gameSocket = inject(GameSocketService);

  readonly preguntaActivaId = input<number | null>(null);
  readonly preguntas = input<any[]>([]);
  readonly tiempoRestante = input<number | null>(null);
  readonly comodinBloqueado = input<string[]>([]);
  readonly comodines = input<ComodinSala[]>([]);
  readonly tokenCompartido = input<string>('');
  readonly interactive = input<boolean>(false);
  readonly seleccionada = output<number>();

  protected readonly currentIndex = signal(0);
  protected readonly localSelectedId = signal<number | null>(null);
  protected readonly respuestaConfirmada = signal(false);

  // IA State
  protected readonly iaSugerencia = signal<{ literal: string; explicacion: string } | null>(null);
  protected readonly cargandoIa = signal(false);

  // Iconos
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly IaIcon = BrainCircuit;
  protected readonly LoaderIcon = Loader2;

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
          // CORRECCIÓN: El componente padre (RoomComponent) ya recibe el evento y debería actualizar la sala.
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
    const v = this.gameSocket.votosPublico();
    const result = this.gameSocket.ultimoResultado();
    const isViewingActive = p?.preguntaId === this.preguntaActivaId();

    if (!p) return [];

    // Combinar datos del historial con el resultado en tiempo real del socket
    const respuestaDada =
      p.respuestaDada ||
      (isViewingActive && result && result.preguntaId === p.preguntaId ? result : null);

    return p.opciones.map((o: any) => {
      const votos = isViewingActive && v ? ((v as any)[o.letra] ?? 0) : 0;
      const total = isViewingActive && v ? v.total : 0;

      return {
        id: o.opcionId,
        letra: o.letra,
        texto: o.texto,
        votos,
        porcentaje: total > 0 ? Math.round((votos / total) * 100) : 0,
        fueElegida: respuestaDada?.opcionId === o.opcionId,
        seleccionLocal: !respuestaDada && !this.respuestaConfirmada() && this.localSelectedId() === o.opcionId,
        estaPendiente: !respuestaDada && this.respuestaConfirmada() && this.localSelectedId() === o.opcionId,
        esCorrecta: respuestaDada
          ? respuestaDada.esCorrecta && respuestaDada.opcionId === o.opcionId
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
    const respuestaDada = p.respuestaDada || (isViewingActive && result && result.preguntaId === p.preguntaId ? result : null);
    if (!respuestaDada) return null;
    return {
      esCorrecta: respuestaDada.esCorrecta,
      feedback: respuestaDada.feedback || '',
    };
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
    }
    // TODO: Implementar Llamada
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
        this.iaSugerencia.set(res);
        this.cargandoIa.set(false);
        // Notificar a la sala para bloquear el uso (Broadcast)
        this.gameSocket.bloquearComodin(token, 'IA');
      },
      error: (err) => {
        console.error('[COMODIN:IA] Error al solicitar ayuda:', err);
        this.cargandoIa.set(false);
        alert('No se pudo obtener la sugerencia de la IA. Por favor, intenta más tarde.');
      },
    });
  }

  protected isComodinUsado(comodin: ComodinSala): boolean {
    return this.comodinBloqueado().includes(comodin.nombre);
  }

  protected getComodinEstadoTexto(comodin: ComodinSala): string {
    if (!comodin.activo) return 'Deshabilitado en la configuración';
    if (this.isComodinUsado(comodin)) return 'Usado en esta ronda';
    return 'Disponible';
  }
}
