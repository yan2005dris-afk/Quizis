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

import { EventHeaderComponent } from '../../room/components/event-header/event-header.component';

@Component({
  selector: 'app-vote-touch-screen',
  standalone: true,
  imports: [EventHeaderComponent],
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

  // Datos adicionales dinámicos
  protected readonly rondaInfo = signal<{ronda: number, totalRondas: number, premio: string} | null>(null);
  protected readonly tituloEvento = signal<string>('Cargando sala...');

  private roomToken = '';
  private pendingQuestion: any = null; // Guarda la pregunta activa hasta que se active el comodín
  private historialPreguntas: any[] = [];

  ngOnInit(): void {
    // 1. Obtener el token de la sala desde la URL y generar un nombre anónimo
    this.route.queryParams
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(params => params['token'] || params['sala']),
        distinctUntilChanged()
      )
      .subscribe(token => {
        if (token) {
          this.roomToken = token;
          const anonymousName = 'Audiencia Digital';
          
          // Obtener detalles de la sala para extraer salaId y rondaId
          this.salasService.obtenerPorId(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (sala) => {
              this.salaId = sala.salaId;
              this.rondaId = sala.rondaActiva?.rondaId;
              this.tituloEvento.set(sala.nombre || 'Sala de Votación');
              
              if (sala.rondaActiva) {
                this.historialPreguntas = sala.rondaActiva.historialPreguntas || [];
                
                let currentQIndex = 1;
                if (sala.rondaActiva.preguntaActual) {
                  const idx = this.historialPreguntas.findIndex((p: any) => p.preguntaId === sala.rondaActiva!.preguntaActualId);
                  if (idx >= 0) currentQIndex = idx + 1;
                }

                this.rondaInfo.set({
                  ronda: currentQIndex,
                  totalRondas: sala.limitePreguntas || this.historialPreguntas.length || 0,
                  premio: '---'
                });
                
                // Guardamos la pregunta actual en pending por si el comodín no está activo aún
                if (sala.rondaActiva.preguntaActual) {
                  this.pendingQuestion = sala.rondaActiva.preguntaActual;
                }
              }
            },
            error: (err) => console.warn('Error al cargar la sala para la audiencia:', err)
          });
          
          // Conectar al websocket y unirse a la sala anónimamente
          try {
            this.socketService.connect();
            this.socketService.unirseASala(this.roomToken, anonymousName);
          } catch (err) {
            console.warn('No se pudo conectar al Socket.io automáticamente:', err);
          }
        }
      });

    // 2. Escuchar eventos en tiempo real desde el servidor de Sockets
    const socketQuestionSubscription = this.socketService.escucharEvento<any>('pregunta_liberada')
      .subscribe((pregunta) => {
        // Guardamos la pregunta pero NO la mostramos hasta que se active el comodín
        if (pregunta) {
          this.pendingQuestion = pregunta;

          // Actualizar el número de pregunta (ronda) en base al historial
          const idx = this.historialPreguntas.findIndex(p => p.preguntaId === pregunta.preguntaId);
          if (idx >= 0) {
            const info = this.rondaInfo();
            if (info) {
              this.rondaInfo.set({ ...info, ronda: idx + 1 });
            }
          }
        }
      });

    const socketTimerSubscription = this.socketService.escucharEvento<number>('temporizador_actualizado')
      .subscribe((tiempo) => {
        this.timeRemaining.set(tiempo);
      });

    const socketInfoRondaSubscription = this.socketService.escucharEvento<any>('info_ronda')
      .subscribe((info) => {
        if (info) {
          this.rondaInfo.set({
            ronda: info.ronda || 0,
            totalRondas: info.totalRondas || 0,
            premio: info.premio || '---'
          });
        }
      });

    // Escuchar cuando la pregunta es respondida por el estudiante para bloquear la pantalla
    const socketRespondidaSubscription = this.socketService.escucharEvento<any>('pregunta_respondida')
      .subscribe(() => {
        this.clearQuestion();
      });

    // Escuchar cuando el jugador se une y le mandan los comodines que ya están bloqueados/usados
    const socketComodinesSubscription = this.socketService.escucharEvento<string[]>('comodines_bloqueados')
      .subscribe((bloqueados) => {
        if (bloqueados && bloqueados.includes('PUBLICO')) {
          if (this.pendingQuestion) {
            this.loadNewQuestion(this.pendingQuestion);
          }
        }
      });

    // Escuchar el evento en vivo cuando el jugador presiona el comodín "Público"
    const socketComodinLiveSubscription = this.socketService.escucharEvento<any>('comodin_bloqueado')
      .subscribe((data) => {
        if (data && data.tipoComodin === 'PUBLICO') {
          if (this.pendingQuestion) {
            this.loadNewQuestion(this.pendingQuestion);
          }
        }
      });

    // 3. Mantener compatibilidad con eventos del navegador (para pruebas unitarias y manuales)
    if (typeof window !== 'undefined') {
      const onRelease = (ev: Event) => {
        const detail = (ev as any).detail;
        this.pendingQuestion = detail?.question;
        // Si ya estuviera activo el comodín, lo cargamos
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
      socketInfoRondaSubscription.unsubscribe();
      socketComodinesSubscription.unsubscribe();
      socketComodinLiveSubscription.unsubscribe();
      socketRespondidaSubscription.unsubscribe();
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
