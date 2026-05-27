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

  describe('initial state', () => {
    it('should initialize observer signals to null/empty', () => {
      expect(service.mensajesChat()).toEqual([]);
      expect(service.eventosSala()).toEqual([]);
      expect(service.participantes()).toEqual([]);
      expect(service.infoRonda()).toBeNull();
    });
  });
});
