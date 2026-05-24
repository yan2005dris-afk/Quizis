import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SalasService, ComodinSala, SalaDetalle } from '../../../../core/services/salas.service';
import { ChatBoxComponent } from '../../chat-box/chat-box.component';
import { EventHeaderComponent } from '../../event-header/event-header.component';
import { EventFeedComponent } from '../../event-feed/event-feed.component';
import { ParticipantsIndexComponent } from '../../participants-index/participants-index.component';
import { ActiveQuestionComponent } from '../../active-question/active-question.component';
import { LucideAngularModule, Activity, Trophy, Users, MessageSquare, Send } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
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

  protected readonly activeTab = signal<'publico' | 'chat'>('publico');
  protected readonly comodines = signal<ComodinSala[]>([]);
  protected readonly salaDetalle = signal<SalaDetalle | null>(null);

  // Iconos Lucide
  protected readonly LiveIcon = Activity;
  protected readonly TrophyIcon = Trophy;
  protected readonly UsersIcon = Users;
  protected readonly ChatIcon = MessageSquare;
  protected readonly SendIcon = Send;

  // Signals derivados para el template
  protected readonly preguntaActiva = this.gameSocket.preguntaActiva;
  protected readonly tiempoRestante = this.gameSocket.tiempoRestante;

  protected readonly opcionesAdaptadas = computed(() => {
    const p = this.preguntaActiva();
    if (!p) return [];
    return p.opciones.map((o) => ({
      id: o.opcionId.toString(),
      texto: o.texto,
      letra: o.letra,
    }));
  });

  protected readonly votosProcesados = computed(() => {
    const v = this.gameSocket.votosPublico();
    return v ?? { total: 0 };
  });

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
    // 1. Cargar Comodines
    this.salasService.obtenerComodines(idOrToken).subscribe({
      next: (data) => this.comodines.set(data),
      error: (err) => console.error('Error cargando comodines:', err),
    });

    // 2. Cargar Detalles de la Sala (Nombre, etc)
    this.salasService.obtenerPorId(idOrToken).subscribe({
      next: (sala) => {
        this.salaDetalle.set(sala);

        // Inicializar estado del socket con datos HTTP para evitar esperas
        this.gameSocket.setEstadoInicial({
          participantes: sala.participantes.map((p) => ({
            id: p.participanteId.toString(),
            nombre: p.nickname,
            puntaje: 0,
          })),
          infoRonda: sala.rondaActiva
            ? {
                ronda: sala.rondaActiva.numeroRonda,
                totalRondas: sala.rondaActiva.historialPreguntas?.length || sala.limitePreguntas,
                premio: '$0',
              }
            : null,
          preguntaActiva: sala.rondaActiva?.preguntaActual || null,
        });

        // 3. Conectar Socket
        const socketUrl = environment.apiUrl.replace('/api/v1', '');
        this.gameSocket.conectar(socketUrl, '');

        // 4. Unirse a la sala cuando el socket esté listo
        const interval = setInterval(() => {
          if (this.gameSocket.conectado()) {
            this.gameSocket.unirseASala(
              sala.tokenCompartido,
              'Observador-' + Math.floor(Math.random() * 1000),
            );
            clearInterval(interval);
          }
        }, 100);

        setTimeout(() => clearInterval(interval), 10000);
      },
      error: (err) => console.error('Error cargando detalles de la sala:', err),
    });
  }

  public onSeleccion(opcionId: string): void {
    console.log('Opción seleccionada por observador:', opcionId);
  }

  public onEnviarMensaje(event: { texto: string; tipo: 'mensaje' | 'sugerencia' }): void {
    this.gameSocket.enviarMensaje(event.texto, event.tipo);
  }
}
