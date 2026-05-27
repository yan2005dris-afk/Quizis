import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BancosService } from '../../../../core/services/bancos.service';
import { SalasService } from '../../../../core/services/salas.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly bancosService = inject(BancosService);
  private readonly salasService = inject(SalasService);

  // ── Estado ─────────────────────────────────────
  readonly isLoading = signal(true);
  readonly totalBancos = signal(0);
  readonly totalPreguntas = signal(0);
  readonly totalSalas = signal(0);
  readonly salasActivas = signal(0);
  readonly ultimosBancos = signal<any[]>([]);
  readonly ultimasSalas = signal<any[]>([]);

  ngOnInit() {
    this.cargarDatos();
  }

  private cargarDatos() {
    this.isLoading.set(true);

    // Cargar bancos
    this.bancosService.getAllBancos().subscribe({
      next: (bancos) => {
        this.totalBancos.set(bancos.length);
        const preguntas = bancos.reduce((acc, b) => acc + (b._count?.preguntas || 0), 0);
        this.totalPreguntas.set(preguntas);
        this.ultimosBancos.set(
          [...bancos]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3)
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    // Cargar salas
    this.salasService.listarTodas().subscribe({
      next: (salas) => {
        this.totalSalas.set(salas.length);
        this.salasActivas.set(salas.filter(s => s.estado === 'jugando').length);
        this.ultimasSalas.set(salas.slice(0, 3));
      },
      error: () => {}
    });
  }
}