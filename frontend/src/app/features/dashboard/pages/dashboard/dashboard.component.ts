import { Component, inject, signal, OnInit } from '@angular/core';
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

  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────

  readonly isLoading = signal(true);

  readonly totalBancos = signal(0);
  readonly totalPreguntas = signal(0);

  readonly totalSalas = signal(0);
  readonly salasActivas = signal(0);

  readonly ultimosBancos = signal<any[]>([]);
  readonly ultimasSalas = signal<any[]>([]);

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ─────────────────────────────────────────────
  // MÉTODOS
  // ─────────────────────────────────────────────

  private cargarDatos(): void {
    this.isLoading.set(true);

    // ==========================
    // CARGAR BANCOS
    // ==========================

    this.bancosService.getAllBancos().subscribe({
      next: (bancos) => {
        // Total bancos
        this.totalBancos.set(bancos.length);

        // Total preguntas
        const preguntas = bancos.reduce((acc, banco) => acc + (banco._count?.preguntas || 0), 0);

        this.totalPreguntas.set(preguntas);

        // Últimos bancos
        const bancosOrdenados = [...bancos]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        this.ultimosBancos.set(bancosOrdenados);

        this.isLoading.set(false);
      },

      error: (err) => {
        console.error('Error al cargar bancos:', err);

        this.isLoading.set(false);
      },
    });

    // ==========================
    // CARGAR SALAS
    // ==========================

    this.salasService.listarTodas().subscribe({
      next: (salas) => {
        // Total salas
        this.totalSalas.set(salas.length);

        // Salas activas
        const activas = salas.filter((sala) => sala.estado === 'jugando').length;

        this.salasActivas.set(activas);

        // Últimas salas
        this.ultimasSalas.set(salas.slice(0, 3));
      },

      error: (err) => {
        console.error('Error al cargar salas:', err);
      },
    });
  }
}
