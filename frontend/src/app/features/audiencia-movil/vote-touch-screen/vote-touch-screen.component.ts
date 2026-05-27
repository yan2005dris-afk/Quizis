import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs';
import { SocketService } from '../../../core/services/socket.service';
import { SalasService } from '../../../core/services/salas.service';

type VoteOptionKey = 'A' | 'B' | 'C' | 'D';

export interface OpcionPregunta {
  id: VoteOptionKey;
  texto: string;
  opcionId?: number;
}

export interface LiveQuestion {
  prompt: string;
  roundLabel?: string;
  premioActual?: string;
  opciones?: OpcionPregunta[];
  preguntaId?: number;
}

@Component({
  selector: 'app-vote-touch-screen',
  standalone: true,
  imports: [],
  templateUrl: './vote-touch-screen.component.html',
  styleUrls: ['./vote-touch-screen.component.scss'],
})
export class VoteTouchScreenComponent implements OnInit {
  // Servicios inyectados
  private readonly socketService = inject(SocketService);
  private readonly salasService = inject(SalasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private salaId?: number;
  private rondaId?: number;
  private readonly anonymousParticipanteId = Math.floor(Math.random() * 1000000);

  // Señales reactivas
  protected readonly currentQuestion = signal<LiveQuestion | null>(null);
  protected readonly selectedOption = signal<VoteOptionKey | null>(null);
  protected readonly isVoteConfirmed = signal<boolean>(false);
  protected readonly timeRemaining = signal<number>(45);
  protected readonly canVote = computed(() => this.currentQuestion() !== null && !this.isVoteConfirmed());

  // Opciones por defecto para el mockup y fallback de pruebas
  protected readonly defaultOptions: OpcionPregunta[] = [
    { id: 'A', texto: 'Python' },
    { id: 'B', texto: 'Java' },
    { id: 'C', texto: 'JavaScript' },
    { id: 'D', texto: 'C++' },
  ];

  // Obtiene las opciones de la pregunta activa o usa las por defecto
  protected readonly activeOptions = computed(() => {
    const question = this.currentQuestion();
    if (question && question.opciones && question.opciones.length === 4) {
      return question.opciones;
    }
    return this.defaultOptions;
  });

  // Datos adicionales para el diseño premium
  protected readonly roundLabel = computed(() => this.currentQuestion()?.roundLabel ?? 'Pregunta 12 / 15');
  protected readonly premioActual = computed(() => this.currentQuestion()?.premioActual ?? '$50,000');

  private roomToken = 'SALA_DEMO';

  ngOnInit(): void {
    // 1. Obtener el token de la sala desde los parámetros de la URL (?token=XYZ o ?sala=XYZ)
    this.route.queryParams
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(params => params['token'] || params['sala']),
        distinctUntilChanged()
      )
      .subscribe(token => {
        if (token) {
          this.roomToken = token;
          
          // Obtener detalles de la sala para extraer salaId y rondaId
          this.salasService.obtenerPorId(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (sala) => {
              this.salaId = sala.salaId;
              this.rondaId = sala.rondaActiva?.rondaId;
            },
            error: (err) => console.warn('Error al cargar la sala para la audiencia:', err)
          });
          
          // Conectar al websocket y unirse a la sala
          try {
            this.socketService.connect();
            this.socketService.unirseASala(this.roomToken, 'Audiencia Móvil');
          } catch (err) {
            console.warn('No se pudo conectar al Socket.io automáticamente:', err);
          }
        }
      });

    // 2. Escuchar eventos en tiempo real desde el servidor de Sockets
    const socketQuestionSubscription = this.socketService.escucharEvento<any>('pregunta_liberada')
      .subscribe((pregunta) => {
        if (pregunta) {
          this.loadNewQuestion(pregunta);
        }
      });

    const socketTimerSubscription = this.socketService.escucharEvento<number>('temporizador_actualizado')
      .subscribe((tiempo) => {
        this.timeRemaining.set(tiempo);
      });

    // 3. Mantener compatibilidad con eventos del navegador (para pruebas unitarias y manuales)
    if (typeof window !== 'undefined') {
      const onRelease = (ev: Event) => {
        const detail = (ev as any).detail;
        this.loadNewQuestion(detail?.question);
      };
      
      const onClose = () => {
        this.clearQuestion();
      };

      window.addEventListener('quizis:question-released', onRelease as EventListener);
      window.addEventListener('quizis:question-closed', onClose as EventListener);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('quizis:question-released', onRelease as EventListener);
        window.removeEventListener('quizis:question-closed', onClose as EventListener);
      });
    }

    // Limpieza de suscripciones de sockets al destruir el componente
    this.destroyRef.onDestroy(() => {
      socketQuestionSubscription.unsubscribe();
      socketTimerSubscription.unsubscribe();
    });
  }

  private loadNewQuestion(pregunta: any): void {
    if (!pregunta) return;

    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones
          .map((opcion: any) => {
            const id = (opcion?.letra || opcion?.opcionId || opcion?.id) as VoteOptionKey | undefined;
            const texto = opcion?.texto || opcion?.opcion || '';

            if (!id || !texto) {
              return null;
            }

            return {
              id,
              texto,
              opcionId: opcion.opcionId
            } as OpcionPregunta;
          })
          .filter((opcion: OpcionPregunta | null): opcion is OpcionPregunta => opcion !== null)
      : undefined;

    // Normalizar la pregunta recibida
    this.currentQuestion.set({
      prompt: pregunta.texto || pregunta.prompt || pregunta.pregunta || 'Pregunta',
      roundLabel: pregunta.roundLabel || pregunta.ronda,
      premioActual: pregunta.premioActual || pregunta.premio,
      opciones,
      preguntaId: pregunta.preguntaId || pregunta.id
    });
    this.selectedOption.set(null);
    this.isVoteConfirmed.set(false);
    this.timeRemaining.set(pregunta.tiempoLimite || pregunta.tiempoRestante || 45);
  }

  private clearQuestion(): void {
    this.currentQuestion.set(null);
    this.selectedOption.set(null);
    this.isVoteConfirmed.set(false);
  }

  protected selectOption(option: VoteOptionKey): void {
    if (!this.canVote()) return;
    this.selectedOption.set(option);
  }

  protected confirmVote(): void {
    const selected = this.selectedOption();
    const question = this.currentQuestion();
    if (!selected || !this.canVote() || !question) return;

    this.isVoteConfirmed.set(true);

    const option = this.activeOptions().find(o => o.id === selected);
    const opcionId = option?.opcionId || 0;

    // Emitir el voto al servidor por Sockets
    try {
      this.socketService.emitirEvento('audience:vote', {
        salaId: this.salaId || 0,
        rondaId: this.rondaId || 0,
        tokenCompartido: this.roomToken,
        preguntaId: question.preguntaId || 0,
        participanteId: this.anonymousParticipanteId,
        opcionId: opcionId
      });
    } catch (err) {
      console.warn('Error al emitir el voto por Sockets:', err);
    }

    // Despachar evento del navegador (compatibilidad de pruebas)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quizis:vote-casted', { 
        detail: { option: selected } 
      }));
    }
  }
}
