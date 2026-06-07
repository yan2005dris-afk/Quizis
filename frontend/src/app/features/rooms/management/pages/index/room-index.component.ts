import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService, SalaResumen } from '../../../../../core/services/salas.service';
import { DatePipe } from '@angular/common';
import { ButtonComponent, AlertComponent } from '../../../../../shared/ui';
import { RoomFormComponent } from '../form/room-form.component';

@Component({
  selector: 'app-room-index',
  standalone: true,
  imports: [RouterLink, DatePipe, ButtonComponent, AlertComponent, RoomFormComponent],
  templateUrl: './room-index.component.html',
  styleUrl: './room-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomIndexComponent implements OnInit {
  private readonly salasService = inject(SalasService);

  protected readonly salas = signal<SalaResumen[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly createOpen = signal(false);

  ngOnInit(): void {
    this.cargarSalas();
  }

  protected onCrearSala(): void {
    this.createOpen.set(true);
  }

  protected cerrarCrearSala(): void {
    this.createOpen.set(false);
  }

  protected onSalaCreada(): void {
    this.createOpen.set(false);
    this.cargarSalas();
  }

  private cargarSalas(): void {
    this.loading.set(true);
    this.error.set(false);

    this.salasService.listarTodas().subscribe({
      next: (salas) => {
        // Ordenar: jugando, esperando, borrador, terminado
        const ordenEstado: Record<string, number> = {
          jugando: 0,
          esperando: 1,
          borrador: 2,
          terminado: 3,
        };
        salas.sort((a, b) => (ordenEstado[a.estado] ?? 99) - (ordenEstado[b.estado] ?? 99));
        this.salas.set(salas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
