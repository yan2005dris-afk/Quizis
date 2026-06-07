import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Users, Gamepad2 } from 'lucide-angular';
import { AlertComponent, ButtonComponent, InputComponent } from '../../../../../shared/ui';
import { SalasService } from '../../../../../core/services/salas.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-join-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    AlertComponent,
    InputComponent,
  ],
  templateUrl: './join-room.component.html',
  styleUrl: './join-room.component.scss',
})
export class JoinRoomComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salasService = inject(SalasService);
  private readonly toastService = inject(ToastService);

  readonly token = signal<string | null>(null);
  readonly nickname = signal('');
  readonly isLoading = signal(false);
  readonly isValidating = signal(true);
  readonly salaInfo = signal<any | null>(null);
  readonly error = signal<string | null>(null);

  readonly UsersIcon = Users;
  readonly GameIcon = Gamepad2;

  ngOnInit(): void {
    const token =
      this.route.snapshot.paramMap.get('token') ?? this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set('El link de invitación no es válido o ha expirado.');
      this.isValidating.set(false);
      return;
    }

    this.token.set(token);
    this.validarToken(token);
  }

  private validarToken(token: string): void {
    this.salasService.validateToken(token).subscribe({
      next: (info) => {
        this.salaInfo.set(info);
        this.isValidating.set(false);
      },
      error: (err) => {
        console.error('Token validation failed', err);
        this.error.set('Lo sentimos, este link de invitación no es válido o la sala ya no existe.');
        this.isValidating.set(false);
      },
    });
  }

  async onJoin(): Promise<void> {
    const name = this.nickname().trim();
    const token = this.token();

    if (!name || !token) return;

    this.isLoading.set(true);

    this.salasService.join(token, name).subscribe({
      next: (res) => {
        // Guardamos el token de participante en localStorage
        // El socket service lo usará para conectarse
        localStorage.setItem('participantToken', res.sessionToken);
        localStorage.setItem('participantInfo', JSON.stringify(res.participante));

        this.toastService.show(
          `¡Bienvenido, ${name}! Entrando a la sala...`,
          'success',
          'Unión Exitosa',
        );

        // Todos los usuarios (estudiantes y observadores) van a la misma vista de sala
        this.router.navigate(['/sala', res.sala.id]);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'No se pudo unir a la sala. Intentá con otro nombre.';
        this.toastService.show(msg, 'danger', 'Error');
      },
    });
  }
}
