import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';

type VoteOptionKey = 'A' | 'B' | 'C' | 'D';

export interface OpcionPregunta {
  id: VoteOptionKey;
  texto: string;
}

export interface LiveQuestion {
  prompt: string;
  roundLabel?: string;
  premioActual?: string;
  opciones?: OpcionPregunta[];
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

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
    this.route.queryParams.subscribe(params => {
      const token = params['token'] || params['sala'];
      if (token) {
        this.roomToken = token;
      }
      
      // Conectar al websocket y unirse a la sala
      try {
        this.socketService.connect();
        this.socketService.unirseASala(this.roomToken, 'Audiencia Móvil');
      } catch (err) {
        console.warn('No se pudo conectar al Socket.io automáticamente:', err);
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
    
    // Normalizar la pregunta recibida
    this.currentQuestion.set({
      prompt: pregunta.prompt || pregunta.pregunta || 'Pregunta',
      roundLabel: pregunta.roundLabel || pregunta.ronda,
      premioActual: pregunta.premioActual || pregunta.premio,
      opciones: pregunta.opciones
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
    if (!selected || !this.canVote()) return;

    this.isVoteConfirmed.set(true);

    // Emitir el voto al servidor por Sockets
    try {
      this.socketService.emitirEvento('voto_recibido', {
        tokenCompartido: this.roomToken,
        userId: 'audiencia_anonima',
        respuestaId: selected
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
