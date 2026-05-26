import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { AlertComponent } from '../alert/alert.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
