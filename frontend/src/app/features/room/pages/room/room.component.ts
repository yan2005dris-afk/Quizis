import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SalasService,
  ComodinSala,
  SalaDetalle,
  EstadoSala,
} from '../../../../core/services/salas.service';
import { ChatBoxComponent } from '../../components/chat-box/chat-box.component';
import { EventHeaderComponent } from '../../components/event-header/event-header.component';
import { EventFeedComponent } from '../../components/event-feed/event-feed.component';
import { ParticipantsIndexComponent } from '../../components/participants-index/participants-index.component';
import { ActiveQuestionComponent } from '../../components/active-question/active-question.component';
import {
  LucideAngularModule,
  Users,
  MessageSquare,
  Play,
  CheckCircle,
  Copy,
  RefreshCw,
  Power,
  Square,
  CirclePause,
  RotateCcw,
} from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ChatBoxComponent,
    EventHeaderComponent,
    EventFeedComponent,
    ParticipantsIndexComponent,
    ActiveQuestionComponent,
    LucideAngularModule,
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit, OnDestroy {
  protected readonly gameSocket = inject(GameSocketService);
  protected readonly auth = inject(AuthService);
  protected readonly salasService = inject(SalasService);
  protected readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<'publico' | 'chat'>('publico');
  protected readonly comodines = signal<ComodinSala[]>([]);
  protected readonly salaDetalle = signal<SalaDetalle | null>(null);
  protected readonly tokenInvitacion = signal<string | null>(null);

  /** UI state for async actions */
  protected readonly regenerandoToken = signal(false);
  protected readonly tokenRegenerado = signal(false);
  protected readonly finalizando = signal(false);
  protected readonly cambiandoEstado = signal(false);
  protected readonly linkCopiado = signal(false);
  protected readonly confirmandoFinalizar = signal(false);
  protected readonly reiniciandoRonda = signal(false);

  // Lucide icons
  protected readonly UsersIcon = Users;
  protected readonly ChatIcon = MessageSquare;
  protected readonly PlayIcon = Play;
  protected readonly CheckIcon = CheckCircle;
  protected readonly CopyIcon = Copy;
  protected readonly RefreshIcon = RefreshCw;
  protected readonly PowerIcon = Power;
  protected readonly StopIcon = Square;
  protected readonly PauseIcon = CirclePause;
  protected readonly RestartIcon = RotateCcw;

  protected readonly preguntaActiva = this.gameSocket.preguntaActiva;
  protected readonly tiempoRestante = this.gameSocket.tiempoRestante;

  protected readonly isHost = computed(() => this.auth.isAuthenticated());

  protected readonly estadoSala = computed(() => this.salaDetalle()?.estado ?? null);

  protected readonly isFinalizado = computed(() => this.estadoSala() === 'FINALIZADO');

  protected readonly isEnVivo = computed(() => this.estadoSala() === 'EN_VIVO');

  protected readonly isEsperando = computed(() => this.estadoSala() === 'ESPERANDO_ALUMNOS');

  protected readonly isBorrador = computed(() => this.estadoSala() === 'BORRADOR');

  protected readonly miNickname = computed(() => {
    if (this.isHost()) return `Host-${this.salaDetalle()?.nombre}`;
    const participantInfo = JSON.parse(localStorage.getItem('participantInfo') ?? '{}');
    return participantInfo.nickname;
  });

  protected readonly miRol = computed(() => {
    if (this.isHost()) return 'host';
    const p = this.gameSocket.participantes().find((x) => x.nombre === this.miNickname());
    return p?.rol || 'observador';
  });

  protected readonly canReleaseNext = computed(() => {
    if (!this.isHost() || this.isFinalizado()) return false;
    const active = this.preguntaActiva();
    const result = this.gameSocket.ultimoResultado();
    return !active || !!result || !!this.salaDetalle()?.rondaActiva?.preguntaActual?.answerDada;
  });

  protected readonly shareableLink = computed(() => {
    const token = this.tokenInvitacion();
    if (!token) return null;
    return `${window.location.origin}/join/${token}`;
  });

  constructor() {
    // Efecto ÚNICO para reaccionar al WS ronda_reiniciada
    // NO lee salaDetalle() para evitar el loop de escritura→re-ejecución
    effect(() => {
      const reinicio = this.gameSocket.rondaReiniciada();
      if (!reinicio?.rondaActiva) return;

      // Actualiza salaDetalle sin leerlo como dependencia
      this.salaDetalle.update((actual) =>
        actual
          ? {
              ...actual,
              estado: reinicio.estado ?? 'ESPERANDO_ALUMNOS',
              rondaActiva: reinicio.rondaActiva,
            }
          : actual,
      );
    });
  }

  ngOnInit(): void {
    const idOrToken = this.route.snapshot.paramMap.get('id');
    if (idOrToken) {
      this.cargarDatosIniciales(idOrToken);
    }
  }

  ngOnDestroy(): void {
    this.gameSocket.desconectar();
  }

  private cargarDatosIniciales(idOrToken: string): void {
    this.salasService.obtenerComodines(idOrToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.comodines.set(data),
        error: (err) => console.error('Error cargando comodines:', err),
      });

    this.salasService.obtenerPorId(idOrToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sala) => {
          this.salaDetalle.set(sala);

          if (this.isHost()) {
            this.salasService.getLinkInvitacion(sala.salaId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (res) => this.tokenInvitacion.set(res.tokenInvitacion),
                error: (err) => console.error('Error cargando link de invitación:', err),
              });
          }

          this.gameSocket.setEstadoInicial({
            participantes: [],
            infoRonda: sala.rondaActiva
              ? {
                  ronda: sala.rondaActiva.numeroRonda,
                  totalRondas: sala.rondaActiva.historialPreguntas?.length || sala.limitePreguntas,
                  premio: '$0',
                }
              : null,
            preguntaActiva: sala.rondaActiva?.preguntaActual ?? null,
            salaHabilitada: sala.estado !== 'FINALIZADO',
          });

          const socketUrl = environment.apiUrl.replace('/api/v1', '');
          const participantToken = localStorage.getItem('participantToken') ?? '';
          this.gameSocket.conectar(socketUrl, participantToken);

          const interval = setInterval(() => {
            if (this.gameSocket.conectado()) {
              const participantInfo = JSON.parse(localStorage.getItem('participantInfo') ?? '{}');
              const nickname = this.isHost()
                ? `Host-${sala.nombre}`
                : (participantInfo.nickname ?? `Estudiante-${Math.floor(Math.random() * 1000)}`);
              this.gameSocket.unirseASala(sala.tokenCompartido, nickname);
              clearInterval(interval);
            }
          }, 100);

          const timeout = setTimeout(() => clearInterval(interval), 10000);

          // Cleanup interval + timeout si el componente se destruye antes
          this.destroyRef.onDestroy(() => {
            clearInterval(interval);
            clearTimeout(timeout);
          });
        },
        error: (err) => console.error('Error cargando detalles de la sala:', err),
      });
  }

  /**
   * Transitions the room to ESPERANDO_ALUMNOS (open for participants).
   * Uses the HTTP estado endpoint with the correct backend enum value.
   */
  public onAbrirSala(): void {
    this.cambiarEstado('ESPERANDO_ALUMNOS');
  }

  /**
   * Transitions the room to EN_VIVO (game in progress).
   */
  public onIniciarJuego(): void {
    this.cambiarEstado('EN_VIVO');
  }

  private cambiarEstado(nuevoEstado: EstadoSala): void {
    const sala = this.salaDetalle();
    if (!sala || this.cambiandoEstado()) return;

    this.cambiandoEstado.set(true);
    this.salasService.updateEstado(sala.salaId, { estado: nuevoEstado }).subscribe({
      next: (updated) => {
        this.salaDetalle.update((s) => (s ? { ...s, estado: updated.estado } : s));
        this.cambiandoEstado.set(false);
        this.gameSocket.salaHabilitada.set(updated.estado !== 'FINALIZADO');
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        this.cambiandoEstado.set(false);
      },
    });
  }

  /**
   * Enable/disable the room live — uses WebSocket (no HTTP endpoint for this).
   */
  public onToggleHabilitada(): void {
    const sala = this.salaDetalle();
    if (!sala) return;
    const nueva = !this.gameSocket.salaHabilitada();
    this.gameSocket.cambiarEstadoSala(sala.tokenCompartido, nueva);
  }

  public onRegenerarToken(): void {
    const sala = this.salaDetalle();
    if (!sala || this.regenerandoToken()) return;

    if (!confirm('¿Regenerar el link de invitación? El link anterior dejará de funcionar.')) return;

    this.regenerandoToken.set(true);
    this.salasService.regenerarToken(sala.salaId).subscribe({
      next: (res) => {
        this.salaDetalle.update((s) => (s ? { ...s, tokenCompartido: res.tokenCompartido } : null));
        this.tokenInvitacion.set(res.tokenInvitacion);
        this.regenerandoToken.set(false);
        this.tokenRegenerado.set(true);
        setTimeout(() => this.tokenRegenerado.set(false), 2000);
      },
      error: (err) => {
        console.error('Error regenerando token:', err);
        this.regenerandoToken.set(false);
      },
    });
  }

  public onFinalizarSala(): void {
    if (!this.confirmandoFinalizar()) {
      this.confirmandoFinalizar.set(true);
      return;
    }

    const sala = this.salaDetalle();
    if (!sala || this.finalizando()) return;

    this.finalizando.set(true);
    this.confirmandoFinalizar.set(false);
    this.salasService.finalizarSala(sala.salaId).subscribe({
      next: () => {
        this.salaDetalle.update((s) => (s ? { ...s, estado: 'FINALIZADO' } : null));
        this.gameSocket.salaHabilitada.set(false);
        this.finalizando.set(false);
      },
      error: (err) => {
        console.error('Error finalizando sala:', err);
        this.finalizando.set(false);
      },
    });
  }

  public onCancelarFinalizar(): void {
    this.confirmandoFinalizar.set(false);
  }

  public onLiberarSiguiente(): void {
    const sala = this.salaDetalle();
    if (!sala?.rondaActiva) return;

    const historial = sala.rondaActiva.historialPreguntas ?? [];
    const proxima = historial.find(
      (p) => !p.respuestaDada && p.preguntaId !== this.preguntaActiva()?.preguntaId,
    );

    if (proxima) {
      this.gameSocket.liberarPregunta(sala.tokenCompartido, proxima);
    }
  }

  public onResponder(opcionId: number): void {
    const sala = this.salaDetalle();
    const pregunta = this.preguntaActiva();
    if (sala?.rondaActiva && pregunta) {
      if (this.miRol() === 'estudiante') {
        this.gameSocket.responderPregunta({
          tokenCompartido: sala.tokenCompartido,
          rondaId: sala.rondaActiva.rondaId,
          preguntaId: pregunta.preguntaId,
          opcionId,
        });
      } else if (this.miRol() === 'observador') {
        const participantInfo = JSON.parse(localStorage.getItem('participantInfo') ?? '{}');
        this.gameSocket.emitirVoto({
          salaId: sala.salaId,
          rondaId: sala.rondaActiva.rondaId,
          tokenCompartido: sala.tokenCompartido,
          preguntaId: pregunta.preguntaId,
          participanteId: participantInfo.id || 0, // Necesita ID real, si no lo tiene, fallará. El id debería venir del backend.
          opcionId,
        });
      }
    }
  }

  public onCopiarLink(): void {
    const link = this.shareableLink();
    if (!link) return;

    navigator.clipboard.writeText(link).then(() => {
      this.linkCopiado.set(true);
      setTimeout(() => this.linkCopiado.set(false), 2000);
    });
  }

  public onEnviarMensaje(event: { texto: string; tipo: 'mensaje' | 'sugerencia' }): void {
    this.gameSocket.enviarMensaje(event.texto, event.tipo);
  }

  public onToggleRol(event: { nickname: string; nuevoRol: 'estudiante' | 'observador' }): void {
    const sala = this.salaDetalle();
    if (!sala) return;
    this.gameSocket.cambiarRolParticipante(sala.tokenCompartido, event.nickname, event.nuevoRol);
  }

  public onReiniciarRonda(): void {
    const sala = this.salaDetalle();
    if (!sala || this.reiniciandoRonda()) return;

    console.log('[REINICIAR] Iniciando HTTP POST para salaId=', sala.salaId);
    this.reiniciandoRonda.set(true);
    this.salasService.reiniciarRonda(sala.salaId).subscribe({
      next: (res) => {
        console.log(
          '[REINICIAR] HTTP OK. estado=',
          res.estado,
          'rondaId=',
          res.rondaActiva?.rondaId,
        );

        // Reset local state immediately — don't wait for WS echo
        this.gameSocket.preguntaActiva.set(null);
        this.gameSocket.ultimoResultado.set(null);
        this.gameSocket.tiempoRestante.set(null);
        this.gameSocket.votosPublico.set(null);
        this.gameSocket.comodinBloqueado.set([]);
        console.log(
          '[REINICIAR] Signals reseteados. comodinBloqueado=',
          this.gameSocket.comodinBloqueado(),
        );

        this.salaDetalle.update((s) =>
          s ? { ...s, estado: res.estado, rondaActiva: res.rondaActiva } : s,
        );
        console.log('[REINICIAR] salaDetalle.estado=', this.salaDetalle()?.estado);

        this.salasService.obtenerComodines(sala.salaId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (comodines) => this.comodines.set(comodines),
            error: (err) => console.error('[REINICIAR] Error recargando comodines:', err),
          });

        // Broadcast to other clients via WS
        this.gameSocket.reiniciarRonda(sala.tokenCompartido, res.rondaActiva);
        this.reiniciandoRonda.set(false);
      },
      error: (err) => {
        console.error('[REINICIAR] Error HTTP:', err);
        this.reiniciandoRonda.set(false);
      },
    });
  }
}
