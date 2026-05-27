import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-confirm" (click)="confirm.emit()">Confirmar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
    }
    .modal-content {
      background: white; padding: 24px; border-radius: 12px;
      width: 90%; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      font-family: inherit;
    }
    h3 { margin: 0 0 12px 0; color: #1f2937; font-size: 1.25rem; font-weight: 600; }
    p { color: #4b5563; margin-bottom: 24px; font-size: 0.95rem; line-height: 1.5; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
    button { padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-cancel { background: #f3f4f6; color: #374151; }
    .btn-cancel:hover { background: #e5e7eb; }
    .btn-confirm { background: #4488ef; color: white; }
    .btn-confirm:hover { background: #4488ef; }
  `]
})
export class ConfirmModalComponent {
  title = input<string>('Confirmar acción');
  message = input<string>('¿Estás seguro de realizar esta acción?');
  
  confirm = output<void>();
  cancel = output<void>();
}