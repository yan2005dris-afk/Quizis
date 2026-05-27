import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  LucideAngularModule,
  BarChart2,
  ChevronRight,
  FileSpreadsheet,
  Clock,
  Users,
  Search,
} from 'lucide-angular';
import { environment } from '../../../../../environments/environment';
import { AnalyticsComponent } from '../analytics/analytics.component';

interface SalaItem {
  salaId: number;
  nombre: string;
  estado: 'BORRADOR' | 'ESPERANDO_ALUMNOS' | 'EN_VIVO' | 'FINALIZADO';
  participantesCount: number;
  creadoEn: string;
}

@Component({
  selector: 'app-reportes-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, DatePipe, AnalyticsComponent],
  templateUrl: './reportes-index.component.html',
  styleUrl: './reportes-index.component.scss',
})
export class ReportesIndexComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly ChartIcon = BarChart2;
  protected readonly ChevronIcon = ChevronRight;
  protected readonly ExcelIcon = FileSpreadsheet;
  protected readonly ClockIcon = Clock;
  protected readonly UsersIcon = Users;
  protected readonly SearchIcon = Search;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly salas = signal<SalaItem[]>([]);
  protected readonly salaSeleccionada = signal<SalaItem | null>(null);
  protected readonly busqueda = signal('');

  protected readonly salasFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase();
    return q
      ? this.salas().filter((s) => s.nombre.toLowerCase().includes(q))
      : this.salas();
  });

  ngOnInit(): void {
    this.http
      .get<any>(`${environment.apiUrl}/salas`)
      .subscribe({
        next: (res) => {
          const data: SalaItem[] = (res.data ?? res ?? []).map((s: any) => ({
            salaId: s.salaId,
            nombre: s.nombre,
            estado: s.estado,
            participantesCount: s.participantes ?? s.participantesCount ?? 0,
            creadoEn: s.creadoEn,
          }));
          this.salas.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las salas.');
          this.loading.set(false);
        },
      });
  }

  protected onSeleccionarSala(sala: SalaItem): void {
    this.salaSeleccionada.set(sala);
  }

  protected onVolver(): void {
    this.salaSeleccionada.set(null);
  }

  protected onBusqueda(e: Event): void {
    this.busqueda.set((e.target as HTMLInputElement).value);
  }

  protected getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      BORRADOR: 'Borrador',
      ESPERANDO_ALUMNOS: 'Esperando',
      EN_VIVO: 'En vivo',
      FINALIZADO: 'Finalizada',
    };
    return map[estado] ?? estado;
  }
}
