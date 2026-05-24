import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type AlertType = 'success' | 'warning' | 'danger' | 'info';

const ICONS: Record<AlertType, string> = {
  success: '✓',
  warning: '⚠',
  danger: '✕',
  info: 'ℹ',
};

@Component({
  selector: 'app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './alert.component.scss',
  template: `
    <div
      [class]="'alert alert--' + type()"
      role="alert"
      [attr.aria-live]="type() === 'danger' ? 'assertive' : 'polite'"
    >
      <span class="alert__icon" aria-hidden="true">{{ icon() }}</span>

      <div class="alert__content">
        @if (title()) {
          <p class="alert__title">{{ title() }}</p>
        }
        <p class="alert__message">{{ message() }}</p>
      </div>

      @if (dismissible()) {
        <button
          class="alert__dismiss"
          type="button"
          aria-label="Cerrar alerta"
          (click)="dismissed.emit()"
        >
          ×
        </button>
      }
    </div>
  `,
})
export class AlertComponent {
  type = input<AlertType>('info');
  title = input<string>('');
  message = input.required<string>();
  dismissible = input<boolean>(false);

  dismissed = output<void>();

  protected icon = computed(() => ICONS[this.type()]);
}
