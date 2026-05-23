import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'ai';
export type ButtonSize    = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './button.component.scss',
  template: `
    <button
      [class]="hostClass()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() || null"
      [attr.aria-disabled]="disabled() || null"
      (click)="clicked.emit()">
      @if (loading()) {
        <span class="btn__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variant   = input<ButtonVariant>('primary');
  size      = input<ButtonSize>('md');
  disabled  = input<boolean>(false);
  loading   = input<boolean>(false);
  fullWidth = input<boolean>(false);

  clicked = output<void>();

  protected hostClass = computed(() => {
    const cls = ['btn', `btn--${this.variant()}`, `btn--${this.size()}`];
    if (this.fullWidth()) cls.push('btn--full');
    if (this.loading())   cls.push('btn--loading');
    return cls.join(' ');
  });
}
