import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService, SalaResumen } from '../../../core/services/salas.service';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Plus } from 'lucide-angular';

@Component({
  selector: 'app-salas-index',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideAngularModule],
  templateUrl: './salas-index.component.html',
  styleUrl: './salas-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalasIndexComponent implements OnInit {
  private readonly salasService = inject(SalasService);

  protected readonly PlusIcon = Plus;
  protected readonly salas = signal<SalaResumen[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.cargarSalas();
  }

  protected onCrearSala(): void {
    console.log('Crear sala clickeado');
  }

  private cargarSalas(): void {
    this.loading.set(true);
    this.error.set(false);

    this.salasService.listarTodas().subscribe({
      next: (salas) => {
        // Ordenar: jugando primero, luego esperando, luego terminado
        const ordenEstado: Record<string, number> = {
          jugando: 0,
          esperando: 1,
          terminado: 2,
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
