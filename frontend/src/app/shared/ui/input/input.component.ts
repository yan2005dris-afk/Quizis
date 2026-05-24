import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'search';

@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="wrapperClass()">
      @if (label()) {
        <label class="input-field__label" [for]="inputId">{{ label() }}</label>
      }

      <input
        [id]="inputId"
        class="input-field__input"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [value]="value()"
        [attr.aria-describedby]="errorMsg() ? inputId + '-err' : null"
        [attr.aria-invalid]="!!errorMsg() || null"
        (input)="onInput($event)"
        (blur)="onTouched()" />

      @if (errorMsg()) {
        <p class="input-field__error" [id]="inputId + '-err'" role="alert">
          {{ errorMsg() }}
        </p>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  label       = input<string>('');
  type        = input<InputType>('text');
  placeholder = input<string>('');
  errorMsg    = input<string>('');

  protected value      = signal<string>('');
  protected _disabled  = signal<boolean>(false);
  protected isDisabled = computed(() => this._disabled());

  protected readonly inputId = `inp-${Math.random().toString(36).slice(2, 7)}`;

  protected wrapperClass = computed(() => {
    const cls = ['input-field'];
    if (this.errorMsg())    cls.push('input-field--error');
    if (this.isDisabled())  cls.push('input-field--disabled');
    return cls.join(' ');
  });

  private onChange: (v: string) => void = (_v: string) => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(val: string): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this._disabled.set(disabled);
  }

  protected onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }
}
