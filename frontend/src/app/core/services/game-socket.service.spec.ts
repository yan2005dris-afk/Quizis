import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameSocketService } from './game-socket.service';
import type {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/room/room.types';

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

describe('GameSocketService (observer extension)', () => {
  let service: GameSocketService;
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = createMockSocket();

    TestBed.configureTestingModule({
      providers: [GameSocketService],
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
    it('should emit enviar_mensaje event with correct payload', () => {
      service.conectar('http://test.local', 'fake-token');

      service.enviarMensaje('Hola a todos', 'mensaje');

      expect(mockSocket.emit).toHaveBeenCalledWith('enviar_mensaje', {
        texto: 'Hola a todos',
        tipo: 'mensaje',
      });
    });

    it('should emit enviar_mensaje event with sugerencia tipo', () => {
      service.conectar('http://test.local', 'fake-token');

      service.enviarMensaje('La respuesta es A', 'sugerencia');

      expect(mockSocket.emit).toHaveBeenCalledWith('enviar_mensaje', {
        texto: 'La respuesta es A',
        tipo: 'sugerencia',
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

    it('should emit activar_comodin_llamada event with correct payload', () => {
      service.conectar('http://test.local', 'fake-token');
      const pregunta = { preguntaId: 1, texto: 'Test', opciones: [], nivel: 1 };
      
      service.activarComodinLlamada('fake-token', pregunta);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('activar_comodin_llamada', {
        tokenCompartido: 'fake-token',
        pregunta,
      });
    });

    it('should emit enviar_pista_consultor event with correct payload', () => {
      service.conectar('http://test.local', 'fake-token');
      
      service.enviarPistaConsultor('fake-token', 1, 'Mi pista');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('enviar_pista_consultor', {
        tokenCompartido: 'fake-token',
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
      
      mockSocket.trigger('comodin_llamada_iniciado', { consultorId: 'c1', consultorNombre: 'Juan' });
      
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
      
      mockSocket.trigger('comodin_llamada_error', { error: 'Consultor no disponible' });
      
      expect(window.alert).toHaveBeenCalledWith('Error con comodín llamada: Consultor no disponible');
    });

    it('should show alert on enviar_pista_error', () => {
      service.conectar('http://test.local', 'fake-token');
      
      mockSocket.trigger('enviar_pista_error', { error: 'Tiempo agotado' });
      
      expect(window.alert).toHaveBeenCalledWith('Error al enviar pista: Tiempo agotado');
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
});
