import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-content">
        <h3 id="modal-title">{{ title() }}</h3>
        <p>{{ message() }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" type="button" (click)="cancelled.emit()">Cancelar</button>
          <button class="btn-confirm" type="button" (click)="confirmed.emit()">Confirmar</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 12, 30, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }

      .modal-content {
        background: #ffffff;
        padding: 24px;
        border-radius: 12px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        font-family: inherit;
        border-top: 4px solid var(--color-primary);
      }

      h3 {
        margin: 0 0 12px;
        color: #1e293b;
        font-size: 1.1rem;
        font-weight: 700;
      }

      p {
        color: #475569;
        margin: 0 0 24px;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition:
          background 0.15s,
          border-color 0.15s;
      }

      .btn-cancel {
        background: #ffffff;
        color: #374151;
        border-color: #d1d5db;

        &:hover {
          background: #f9fafb;
          border-color: #cbd5e1;
        }
      }

      .btn-confirm {
        background: var(--color-primary);
        color: #ffffff;
        border-color: var(--color-primary-hover);

        &:hover {
          background: var(--color-primary-hover);
        }
      }
    `,
  ],
})
export class ConfirmModalComponent {
  readonly title = input<string>('Confirmar acción');
  readonly message = input<string>('¿Estás seguro de realizar esta acción?');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
