import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io } from 'socket.io-client';
import { GameSocketService } from './game-socket.service';
import type {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/room/room.types';

// --- Mock socket.io-client ---
// En lugar de depender de mock.calls internos de vitest (que fallan en CI),
// capturamos los handlers en un Map cuando mockSocket.on() se invoca.

const eventHandlers = new Map<string, (...args: any[]) => void>();

const mockSocket = {
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    eventHandlers.set(event, handler);
    return mockSocket;
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('GameSocketService (observer extension)', () => {
  let service: GameSocketService;

  beforeEach(() => {
    eventHandlers.clear();
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    vi.mocked(io).mockClear();

    TestBed.configureTestingModule({
      providers: [GameSocketService],
    });
    service = TestBed.inject(GameSocketService);
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

      const handler = eventHandlers.get('mensaje_chat');
      expect(handler).toBeDefined();
      handler!(chatMessages);

      expect(service.mensajesChat()).toEqual(chatMessages);
      expect(service.mensajesChat()).toHaveLength(2);
    });

    it('should update eventosSala signal when evento_sala event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const eventos: SalaEvento[] = [
        { tipo: 'usuario_entra', mensaje: 'Alice entró', timestamp: 1000 },
        { tipo: 'inicio_pregunta', mensaje: 'Nueva pregunta', timestamp: 1002 },
      ];

      const handler = eventHandlers.get('evento_sala');
      expect(handler).toBeDefined();
      handler!(eventos);

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

      const handler = eventHandlers.get('participantes');
      expect(handler).toBeDefined();
      handler!(participantes);

      expect(service.participantes()).toEqual(participantes);
      expect(service.participantes()).toHaveLength(3);
    });

    it('should update infoRonda signal when info_ronda event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const rondaInfo: RondaInfo = { ronda: 1, totalRondas: 5, premio: '$1000' };

      const handler = eventHandlers.get('info_ronda');
      expect(handler).toBeDefined();
      handler!(rondaInfo);

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
