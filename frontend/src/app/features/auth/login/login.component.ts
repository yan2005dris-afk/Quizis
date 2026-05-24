import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, Globe } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly GlobeIcon = Globe;

  async onSubmit() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.login(this.email(), this.password());
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }
}
