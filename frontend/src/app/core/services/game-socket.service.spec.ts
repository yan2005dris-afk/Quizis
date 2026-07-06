import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameSocketService } from './game-socket.service';
import { GameApiService } from './game-api.service';
import { ToastService } from './toast.service';
import type {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/rooms/game/play.types';

// --- Mock socket without vi.mock ---
// Angular's @angular/build:unit-test bundles modules before vitest can
// intercept them via vi.mock. Instead, we create a mock socket and
// inject it via vi.spyOn(service, 'createSocketConnection').

function createMockSocket() {
  const handlers = new Map<string, (...args: any[]) => void>();
  return {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers.set(event, handler);
      return handlers; // not used for chaining, but needed for type compat
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    /** Invoke a registered handler as if the server sent the event */
    trigger(event: string, ...args: any[]) {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
  };
}

type MockSocket = ReturnType<typeof createMockSocket>;

// Mock toast service that captures show() calls
const mockToasts: { message: string; type: string; title?: string }[] = [];
const mockToastService = {
  show: vi.fn((message: string, type: string, title?: string) => {
    mockToasts.push({ message, type, title });
  }),
};

// --- Mock socket without vi.mock ---
describe('GameSocketService (observer extension)', () => {
  let service: GameSocketService;
  let mockSocket: MockSocket;
  let mockApi: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockToasts.length = 0;
    mockSocket = createMockSocket();
    mockApi = {
      submitAnswer: vi
        .fn()
        .mockReturnValue(
          of({ status: 'single' as const, winningOpcionId: 1, esCorrecta: true, feedback: 'ok' }),
        ),
      updateEstadoSala: vi.fn().mockReturnValue(of({ salaId: 1, estado: 'EN_VIVO' as const })),
      liberarPregunta: vi
        .fn()
        .mockReturnValue(of({ preguntaId: 1, texto: '', opciones: [], nivel: 1 })),
      regenerarToken: vi.fn().mockReturnValue(of({ tokenCompartido: 'new-tok' })),
      finalizarPartida: vi.fn().mockReturnValue(of({ totalParticipantes: 1 })),
      reiniciarRonda: vi.fn().mockReturnValue(of({})),
      cambiarRolParticipante: vi.fn().mockReturnValue(of({})),
      votar: vi.fn().mockReturnValue(of({})),
      enviarMensaje: vi.fn().mockReturnValue(of({})),
      bloquearComodin: vi.fn().mockReturnValue(of({})),
      activarComodinLlamada: vi.fn().mockReturnValue(of({})),
      enviarPistaConsultor: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        GameSocketService,
        { provide: ToastService, useValue: mockToastService },
        { provide: GameApiService, useValue: mockApi },
      ],
    });
    service = TestBed.inject(GameSocketService);

    // Replace the protected method with our mock
    vi.spyOn(service as any, 'createSocketConnection').mockReturnValue(mockSocket);
  });

  afterEach(() => {
    service.desconectar();
  });

  describe('observer signals', () => {
    it('should update mensajesChat signal when mensaje_chat event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const chatMessages: ChatMessage[] = [
        { usuario: 'Alice', texto: 'Hola', timestamp: 1000, tipo: 'mensaje' },
        { usuario: 'Bob', texto: 'Hola!', timestamp: 1001, tipo: 'mensaje' },
      ];

      mockSocket.trigger('mensaje_chat', chatMessages);

      expect(service.mensajesChat()).toEqual(chatMessages);
      expect(service.mensajesChat()).toHaveLength(2);
    });

    it('should append mensajesChat signal when mensaje_chat_nuevo event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      // Start with existing messages
      const initial: ChatMessage[] = [
        { usuario: 'Alice', texto: 'Hola', timestamp: 1000, tipo: 'mensaje' },
      ];
      mockSocket.trigger('mensaje_chat', initial);

      // New message arrives
      const nuevo: ChatMessage = {
        usuario: 'Bob',
        texto: 'Hola!',
        timestamp: 1001,
        tipo: 'mensaje',
      };
      mockSocket.trigger('mensaje_chat_nuevo', nuevo);

      expect(service.mensajesChat()).toHaveLength(2);
      expect(service.mensajesChat()[1]).toEqual(nuevo);
    });

    it('should update eventosSala signal when evento_sala event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const eventos: SalaEvento[] = [
        { tipo: 'usuario_entra', mensaje: 'Alice entró', timestamp: 1000 },
        { tipo: 'inicio_pregunta', mensaje: 'Nueva pregunta', timestamp: 1002 },
      ];

      mockSocket.trigger('evento_sala', eventos);

      expect(service.eventosSala()).toEqual(eventos);
      expect(service.eventosSala()).toHaveLength(2);
    });

    it('should update participantes signal when participantes event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const participantes: Participante[] = [
        { id: '1', nombre: 'Alice', puntaje: 100, rol: 'estudiante' },
        { id: '2', nombre: 'Bob', puntaje: 85, rol: 'observador' },
        { id: '3', nombre: 'Charlie', puntaje: 72, rol: 'admin' },
      ];

      mockSocket.trigger('participantes', participantes);

      expect(service.participantes()).toEqual(participantes);
      expect(service.participantes()).toHaveLength(3);
    });

    it('should update infoRonda signal when info_ronda event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const rondaInfo: RondaInfo = { ronda: 1, totalRondas: 5, premio: '$1000' };

      mockSocket.trigger('info_ronda', rondaInfo);

      expect(service.infoRonda()).toEqual(rondaInfo);
      expect(service.infoRonda()?.ronda).toBe(1);
      expect(service.infoRonda()?.totalRondas).toBe(5);
    });
  });

  describe('enviarMensaje', () => {
    it('should call GameApiService.enviarMensaje with correct payload', () => {
      service.conectar('http://test.local', 'fake-token');
      service.unirseASala('tok-123', 'TestUser');

      service.enviarMensaje('tok-123', 'Hola a todos', 'mensaje');

      expect(mockApi['enviarMensaje']).toHaveBeenCalledWith('tok-123', {
        texto: 'Hola a todos',
        tipo: 'mensaje',
        nickname: 'TestUser',
      });
    });

    it('should handle sugerencia tipo', () => {
      service.conectar('http://test.local', 'fake-token');
      service.unirseASala('tok-123', 'TestUser');

      service.enviarMensaje('tok-123', 'La respuesta es A', 'sugerencia');

      expect(mockApi['enviarMensaje']).toHaveBeenCalledWith('tok-123', {
        texto: 'La respuesta es A',
        tipo: 'sugerencia',
        nickname: 'TestUser',
      });
    });
  });

  describe('comodines', () => {
    it('should update comodinBloqueado signal when comodin_bloqueado event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('comodin_bloqueado', { tipoComodin: 'PUBLICO' });

      expect(service.comodinBloqueado()).toEqual(['PUBLICO']);
    });

    it('should update comodinBloqueado signal when comodin_usado event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('comodin_usado', { tipoComodin: 'LLAMADA' });

      expect(service.comodinBloqueado()).toEqual(['LLAMADA']);
    });

    it('should set initial blocked comodines when comodines_bloqueados event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('comodines_bloqueados', ['PUBLICO', 'IA']);

      expect(service.comodinBloqueado()).toEqual(['PUBLICO', 'IA']);
    });
  });

  describe('comodín llamada', () => {
    beforeEach(() => {
      vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should call GameApiService.activarComodinLlamada with token', () => {
      service.conectar('http://test.local', 'fake-token');
      const pregunta = { preguntaId: 1, texto: 'Test', opciones: [], nivel: 1 };
      void pregunta;

      service.activarComodinLlamada('fake-token', pregunta);

      expect(mockApi['activarComodinLlamada']).toHaveBeenCalledWith('fake-token');
    });

    it('should call GameApiService.enviarPistaConsultor with token + payload', () => {
      service.conectar('http://test.local', 'fake-token');

      service.enviarPistaConsultor('fake-token', 1, 'Mi pista');

      expect(mockApi['enviarPistaConsultor']).toHaveBeenCalledWith('fake-token', {
        preguntaId: 1,
        pista: 'Mi pista',
      });
    });

    it('should update state when consultor_seleccionado event is received', () => {
      service.conectar('http://test.local', 'fake-token');
      const pregunta = { preguntaId: 1, texto: 'Test', opciones: [], nivel: 1 };

      mockSocket.trigger('consultor_seleccionado', { pregunta });

      expect(service.llamadaActiva()).toBe(true);
      expect(service.preguntaConsultor()).toEqual(pregunta);
    });

    it('should update state when comodin_llamada_iniciado event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('comodin_llamada_iniciado', {
        consultorId: 'c1',
        consultorNombre: 'Juan',
      });

      expect(service.llamadaActiva()).toBe(true);
      expect(service.consultorAsignado()).toBe('Juan');
    });

    it('should update state when pista_consultor_recibida event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('pista_consultor_recibida', { pista: 'La respuesta es A' });

      expect(service.pistaConsultor()).toBe('La respuesta es A');
    });

    it('should show alert on comodin_llamada_error', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('comodin_llamada_error', { message: 'Consultor no disponible' });

      expect(
        mockToasts.some((t) => t.message === 'Consultor no disponible' && t.type === 'warning'),
      ).toBe(true);
    });

    it('should show alert on enviar_pista_error', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('enviar_pista_error', { message: 'Tiempo agotado' });

      expect(mockToasts.some((t) => t.message === 'Tiempo agotado' && t.type === 'warning')).toBe(
        true,
      );
    });
  });

  describe('initial state', () => {
    it('should initialize observer signals to null/empty', () => {
      expect(service.mensajesChat()).toEqual([]);
      expect(service.eventosSala()).toEqual([]);
      expect(service.participantes()).toEqual([]);
      expect(service.infoRonda()).toBeNull();
      expect(service.llamadaActiva()).toBe(false);
      expect(service.consultorAsignado()).toBeNull();
      expect(service.preguntaConsultor()).toBeNull();
      expect(service.pistaConsultor()).toBeNull();
    });
  });

  // ─── NEW: partida_finalizada event handler ────────────────────────

  describe('partida_finalizada event', () => {
    it('should set salaHabilitada to false when partida_finalizada event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      // salaHabilitada starts as true
      expect(service.salaHabilitada()).toBe(true);

      // When partida_finalizada fires
      mockSocket.trigger('partida_finalizada', { totalParticipantes: 5 });

      // salaHabilitada should be set to false
      expect(service.salaHabilitada()).toBe(false);
    });

    it('should set salaHabilitada to false regardless of payload shape', () => {
      service.conectar('http://test.local', 'fake-token');

      // Start with true
      expect(service.salaHabilitada()).toBe(true);

      // Fire with different payload shape (no totalParticipantes)
      mockSocket.trigger('partida_finalizada', {});

      // Still sets salaHabilitada to false
      expect(service.salaHabilitada()).toBe(false);
    });
  });

  // ─── BUG 1: opcionesEliminadas singleton signal ─────────────────────

  describe('opcionesEliminadas signal (Bug 1)', () => {
    it('should initialize to empty array', () => {
      service.conectar('http://test.local', 'fake-token');
      expect(service.opcionesEliminadas()).toEqual([]);
    });

    it('should be set to [] on ronda_reiniciada event', () => {
      service.conectar('http://test.local', 'fake-token');

      // Simulate some options being eliminated
      service.opcionesEliminadas.set([1, 3]);
      expect(service.opcionesEliminadas()).toEqual([1, 3]);

      // Trigger round restart
      mockSocket.trigger('ronda_reiniciada', { rondaActiva: {} });

      // opcionesEliminadas must be cleared
      expect(service.opcionesEliminadas()).toEqual([]);
    });

    it('should NOT reset on pregunta_liberada (only on round restart)', () => {
      service.conectar('http://test.local', 'fake-token');

      service.opcionesEliminadas.set([2]);
      const pregunta = { preguntaId: 1, texto: 'Test', opciones: [], nivel: 1 };

      mockSocket.trigger('pregunta_liberada', pregunta);
      // opcionesEliminadas is not cleared by pregunta_liberada — only by ronda_reiniciada
      expect(service.opcionesEliminadas()).toEqual([2]);
    });
  });

  // ─── BUG 3: iaSugerenciaGlobal signal ──────────────────────────────

  describe('iaSugerenciaGlobal signal (Bug 3)', () => {
    it('should initialize to null', () => {
      service.conectar('http://test.local', 'fake-token');
      expect(service.iaSugerenciaGlobal()).toBeNull();
    });

    it('should be set when ia_sugerencia_recibida event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('ia_sugerencia_recibida', {
        preguntaId: 5,
        literal: 'B',
        explicacion: 'Option B is correct because...',
      });

      expect(service.iaSugerenciaGlobal()).toEqual({
        literal: 'B',
        explicacion: 'Option B is correct because...',
      });
    });

    it('should be reset to null on pregunta_liberada event', () => {
      service.conectar('http://test.local', 'fake-token');

      // Set global IA suggestion
      mockSocket.trigger('ia_sugerencia_recibida', {
        preguntaId: 3,
        literal: 'C',
        explicacion: 'C is correct',
      });
      expect(service.iaSugerenciaGlobal()).not.toBeNull();

      // New question released
      const pregunta = { preguntaId: 4, texto: 'New Q', opciones: [], nivel: 1 };
      mockSocket.trigger('pregunta_liberada', pregunta);

      // IA suggestion must be cleared
      expect(service.iaSugerenciaGlobal()).toBeNull();
    });

    it('should NOT be reset on ronda_reiniciada (only on pregunta_liberada)', () => {
      service.conectar('http://test.local', 'fake-token');

      mockSocket.trigger('ia_sugerencia_recibida', {
        preguntaId: 2,
        literal: 'D',
        explicacion: 'D',
      });
      expect(service.iaSugerenciaGlobal()).not.toBeNull();

      mockSocket.trigger('ronda_reiniciada', { rondaActiva: {} });
      // iaSugerenciaGlobal is NOT cleared by round restart
      expect(service.iaSugerenciaGlobal()).not.toBeNull();
    });
  });
});
