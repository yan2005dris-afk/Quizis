import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameSocketService } from './game-socket.service';
import type {
  ChatMessage,
  SalaEvento,
  Participante,
  RondaInfo,
} from '../../features/observer-room/observer-room.types';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('GameSocketService (observer extension)', () => {
  let service: GameSocketService;

  beforeEach(() => {
    vi.clearAllMocks();
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

      // Simular el evento del servidor
      const onCalls = mockSocket.on.mock.calls;
      const mensajeChatHandler = onCalls.find(([event]) => event === 'mensaje_chat');
      expect(mensajeChatHandler).toBeDefined();

      if (mensajeChatHandler) {
        mensajeChatHandler[1](chatMessages);
      }

      expect(service.mensajesChat()).toEqual(chatMessages);
      expect(service.mensajesChat()).toHaveLength(2);
    });

    it('should update eventosSala signal when evento_sala event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const eventos: SalaEvento[] = [
        { tipo: 'usuario_entra', mensaje: 'Alice entró', timestamp: 1000 },
        { tipo: 'inicio_pregunta', mensaje: 'Nueva pregunta', timestamp: 1002 },
      ];

      const onCalls = mockSocket.on.mock.calls;
      const eventoHandler = onCalls.find(([event]) => event === 'evento_sala');
      expect(eventoHandler).toBeDefined();

      if (eventoHandler) {
        eventoHandler[1](eventos);
      }

      expect(service.eventosSala()).toEqual(eventos);
      expect(service.eventosSala()).toHaveLength(2);
    });

    it('should update participantes signal when participantes event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const participantes: Participante[] = [
        { id: '1', nombre: 'Alice', puntaje: 100 },
        { id: '2', nombre: 'Bob', puntaje: 85 },
        { id: '3', nombre: 'Charlie', puntaje: 72 },
      ];

      const onCalls = mockSocket.on.mock.calls;
      const participantesHandler = onCalls.find(([event]) => event === 'participantes');
      expect(participantesHandler).toBeDefined();

      if (participantesHandler) {
        participantesHandler[1](participantes);
      }

      expect(service.participantes()).toEqual(participantes);
      expect(service.participantes()).toHaveLength(3);
    });

    it('should update infoRonda signal when info_ronda event is received', () => {
      service.conectar('http://test.local', 'fake-token');

      const rondaInfo: RondaInfo = { ronda: 1, totalRondas: 5, premio: '$1000' };

      const onCalls = mockSocket.on.mock.calls;
      const rondaHandler = onCalls.find(([event]) => event === 'info_ronda');
      expect(rondaHandler).toBeDefined();

      if (rondaHandler) {
        rondaHandler[1](rondaInfo);
      }

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
