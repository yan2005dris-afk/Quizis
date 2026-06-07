import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { ChatBoxComponent } from './chat-box.component';
import type { ChatMessage } from '../../game.types';

describe('ChatBoxComponent', () => {
  let fixture: ComponentFixture<ChatBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatBoxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatBoxComponent);
    fixture.componentRef.setInput('conectado', true);
  });

  it('should render chat messages', () => {
    const mensajes: ChatMessage[] = [
      { usuario: 'Alice', texto: 'Hola', timestamp: 1000, tipo: 'mensaje' },
      { usuario: 'Bob', texto: 'Hola!', timestamp: 1001, tipo: 'mensaje' },
    ];
    fixture.componentRef.setInput('mensajes', mensajes);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="chat-message"]');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Alice');
    expect(items[0].textContent).toContain('Hola');
    expect(items[1].textContent).toContain('Bob');
  });

  it('should show empty state when there are no messages', () => {
    fixture.componentRef.setInput('mensajes', []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No hay mensajes');
  });

  it('should emit enviar event when send button is clicked', () => {
    fixture.componentRef.setInput('mensajes', []);
    fixture.detectChanges();

    const enviarSpy = vi.fn();
    fixture.componentInstance.enviar.subscribe(enviarSpy);

    const input = fixture.nativeElement.querySelector(
      '[data-testid="chat-input"]',
    ) as HTMLInputElement;
    input.value = 'Hola a todos';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="send-button"]',
    ) as HTMLButtonElement;
    button.click();

    expect(enviarSpy).toHaveBeenCalledWith({ texto: 'Hola a todos', tipo: 'mensaje' });
  });

  it('should show offline badge when disconnected', () => {
    fixture.componentRef.setInput('mensajes', []);
    fixture.componentRef.setInput('conectado', false);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[data-testid="offline-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Sin conexión');
  });

  it('should apply disabled styles when disconnected', () => {
    fixture.componentRef.setInput('mensajes', []);
    fixture.componentRef.setInput('conectado', false);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('[data-testid="chat-input"]'));
    const button = fixture.debugElement.query(By.css('[data-testid="send-button"]'));

    expect(input.nativeElement.classList.contains('chat-box__input--disabled')).toBe(true);
    expect(button.nativeElement.classList.contains('chat-box__send--disabled')).toBe(true);
  });
});
