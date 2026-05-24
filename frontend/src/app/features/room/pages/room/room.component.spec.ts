import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomComponent } from './room.component';
import { GameSocketService } from '../../../../core/services/game-socket.service';
import type { RondaInfo, Participante, ChatMessage } from '../../room.types';

describe('RoomComponent', () => {
  let fixture: ComponentFixture<RoomComponent>;
  let gameSocket: GameSocketService;

  beforeEach(async () => {
    // Mock localStorage for AuthService constructor
    Object.defineProperty(globalThis, 'localStorage', {
      value: { 
        getItem: () => null, 
        setItem: () => { /* No-op */ }, 
        removeItem: () => { /* No-op */ } 
      },
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [RoomComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomComponent);
    gameSocket = TestBed.inject(GameSocketService);
  });

  it('should render EventHeader in the top section', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-event-header')).toBeTruthy();
  });

  it('should embed app-active-question in the left (70%) column', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-active-question')).toBeTruthy();
  });

  it('should render right column with publico and chat tab buttons', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('.room__tab-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Público');
    expect(buttons[1].textContent).toContain('Chat en Vivo');
  });

  it('should show EventFeed and ParticipantsList when publico tab is active', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-event-feed')).toBeTruthy();
    expect(el.querySelector('app-participants-list')).toBeTruthy();
    expect(el.querySelector('app-chat-box')).toBeFalsy();
  });

  it('should show ChatBox when chat tab is clicked', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const chatTab = el.querySelectorAll('.room__tab-btn')[1] as HTMLButtonElement;
    chatTab.click();
    fixture.detectChanges();

    expect(el.querySelector('app-chat-box')).toBeTruthy();
    expect(el.querySelector('app-event-feed')).toBeFalsy();
  });

  it('should render data from GameSocketService signals in child components', () => {
    const rondaInfo: RondaInfo = { ronda: 2, totalRondas: 8, premio: '$2000' };
    gameSocket.infoRonda.set(rondaInfo);

    const participantes: Participante[] = [{ id: '1', nombre: 'Alice', puntaje: 100 }];
    gameSocket.participantes.set(participantes);

    const mensajes: ChatMessage[] = [
      { usuario: 'Alice', texto: 'Hola', timestamp: 1000, tipo: 'mensaje' },
    ];
    gameSocket.mensajesChat.set(mensajes);

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pregunta 2');
    expect(el.textContent).toContain('de 8');
    expect(el.textContent).toContain('$2000');
    expect(el.textContent).toContain('Alice');
    expect(el.textContent).toContain('100');
  });

  it('should show empty state sections when no data', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No hay eventos');
    expect(el.textContent).toContain('No hay participantes');

    // Switch to chat tab to verify chat empty state
    const chatTab = el.querySelectorAll('.room__tab-btn')[1] as HTMLButtonElement;
    chatTab.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('No hay mensajes');
  });

  it('should display observer footer note', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Estás viendo como observador');
  });

  it('should show auth banner when user is not authenticated', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No estás autenticado');
    expect(el.querySelector('.room__auth-banner')).toBeTruthy();
  });
});
