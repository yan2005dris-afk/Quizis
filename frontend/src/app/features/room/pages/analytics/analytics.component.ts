import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import {
  LucideAngularModule,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  BookOpen,
  Filter,
  ArrowUpDown,
} from 'lucide-angular';
import { ReportDataDto, ReportesService } from '../../../../core/services/reportes.service';

type SortField = 'nickname' | 'correctas' | 'incorrectas' | 'porcentaje' | 'comodines';
type SortDir = 'asc' | 'desc';

/** Fila consolidada por participante */
interface ParticipantRow {
  nickname: string;
  rondas: number;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  porcentaje: number;
  comodines: number;
}

@Component({
  selector: 'app-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, SlicePipe, UpperCasePipe],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  readonly salaId = input.required<number>();

  private readonly reportesService = inject(ReportesService);

  // ── Icons ──────────────────────────────────
  protected readonly ExcelIcon = FileSpreadsheet;
  protected readonly PdfIcon = FileText;
  protected readonly TrendIcon = TrendingUp;
  protected readonly UsersIcon = Users;
  protected readonly OkIcon = CheckCircle;
  protected readonly FailIcon = XCircle;
  protected readonly BookIcon = BookOpen;
  protected readonly FilterIcon = Filter;
  protected readonly SortIcon = ArrowUpDown;

  // ── State ──────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly exporting = signal<'excel' | 'pdf' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<ReportDataDto | null>(null);
  protected readonly sortField = signal<SortField>('porcentaje');
  protected readonly sortDir = signal<SortDir>('desc');
  protected readonly searchQuery = signal('');
  protected readonly expandedNick = signal<string | null>(null);

  // ── Computed ──────────────────────────────
  protected readonly rows = computed<ParticipantRow[]>(() => {
    const d = this.data();
    if (!d) return [];

    const mapa = new Map<string, ParticipantRow>();
    for (const r of d.rondas) {
      const e = mapa.get(r.participanteNickname);
      if (e) {
        e.rondas++;
        e.totalPreguntas += r.totalPreguntas;
        e.correctas += r.correctas;
        e.incorrectas += r.incorrectas;
        e.comodines += r.comodinesUsados.length;
      } else {
        mapa.set(r.participanteNickname, {
          nickname: r.participanteNickname,
          rondas: 1,
          totalPreguntas: r.totalPreguntas,
          correctas: r.correctas,
          incorrectas: r.incorrectas,
          porcentaje: r.porcentajeAcierto,
          comodines: r.comodinesUsados.length,
        });
      }
    }
    // Recalcular porcentaje consolidado
    const list: ParticipantRow[] = [];
    mapa.forEach((row) => {
      row.porcentaje =
        row.totalPreguntas > 0 ? Math.round((row.correctas / row.totalPreguntas) * 100) : 0;
      list.push(row);
    });
    return list;
  });

  protected readonly filteredRows = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const r = q
      ? this.rows().filter((x) => x.nickname.toLowerCase().includes(q))
      : [...this.rows()];

    const field = this.sortField();
    const dir = this.sortDir();
    r.sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (field) {
        case 'nickname':
          av = a.nickname;
          bv = b.nickname;
          break;
        case 'correctas':
          av = a.correctas;
          bv = b.correctas;
          break;
        case 'incorrectas':
          av = a.incorrectas;
          bv = b.incorrectas;
          break;
        case 'comodines':
          av = a.comodines;
          bv = b.comodines;
          break;
        default:
          av = a.porcentaje;
          bv = b.porcentaje;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return r;
  });

  protected readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return null;
    const g = d.resumenGeneral;
    return {
      participantes: g.participantes.length,
      totalPreguntas: g.totalPreguntasRespondidas,
      correctas: g.totalCorrectas,
      incorrectas: g.totalIncorrectas,
      porcentajeGlobal: g.porcentajeGlobal,
      totalRondas: g.totalRondas,
    };
  });

  ngOnInit(): void {
    this.reportesService.generarReporte(this.salaId()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el reporte.');
        this.loading.set(false);
      },
    });
  }

  // ── Ordenamiento ──────────────────────────
  protected onSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
  }

  protected onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  protected onToggleExpand(nick: string): void {
    this.expandedNick.update((n) => (n === nick ? null : nick));
  }

  protected getRondasDeParticipante(nick: string) {
    return this.data()?.rondas.filter((r) => r.participanteNickname === nick) ?? [];
  }

  // ── Exportación ───────────────────────────
  protected onExportExcel(): void {
    if (this.exporting()) return;
    const d = this.data();
    if (!d) return;
    this.exporting.set('excel');

    // Genera CSV → descarga como .xlsx compatible
    const header = [
      'Participante',
      'Rondas',
      'Preguntas',
      'Correctas',
      'Incorrectas',
      '% Acierto',
      'Comodines',
    ];
    const rows = this.rows().map((r) => [
      r.nickname,
      r.rondas,
      r.totalPreguntas,
      r.correctas,
      r.incorrectas,
      `${r.porcentaje}%`,
      r.comodines,
    ]);

    // Hoja de detalle por ronda
    const detailHeader = [
      'Ronda',
      'Participante',
      'Pregunta',
      'Respuesta',
      '¿Correcta?',
      'Comodín',
      '% Votos Público',
    ];
    const detailRows: any[][] = [];
    for (const ronda of d.rondas) {
      for (const p of ronda.preguntas) {
        detailRows.push([
          ronda.numeroRonda,
          ronda.participanteNickname,
          p.texto,
          p.respuestaElegida,
          p.esCorrecta ? 'Sí' : 'No',
          p.comodinUsado ?? '-',
          p.porcentajeVotosPublico != null ? `${p.porcentajeVotosPublico}%` : '-',
        ]);
      }
    }

    const csvContent = [
      `Sala: ${d.nombreSala}`,
      `Docente: ${d.docente}`,
      `Fecha: ${new Date(d.fechaCreacion).toLocaleDateString('es-EC')}`,
      `Promedio global: ${d.resumenGeneral.porcentajeGlobal}%`,
      '',
      'RESUMEN POR PARTICIPANTE',
      header.join(','),
      ...rows.map((r) => r.map(sanitizeCsvCell).join(',')),
      '',
      'DETALLE POR RONDA',
      detailHeader.join(','),
      ...detailRows.map((r) => r.map(sanitizeCsvCell).join(',')),
    ].join('\n');

    this.downloadFile(
      '\uFEFF' + csvContent,
      `reporte_${d.nombreSala.replace(/\s+/g, '_')}.csv`,
      'text/csv;charset=utf-8;',
    );
    this.exporting.set(null);
  }

  protected onExportPdf(): void {
    if (this.exporting()) return;
    const d = this.data();
    if (!d) return;
    this.exporting.set('pdf');

    const rows = this.rows();
    const fecha = new Date(d.fechaCreacion).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const rowsHtml = rows
      .map(
        (r, i) => `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(r.nickname)}</strong></td>
        <td>${r.rondas}</td>
        <td>${r.totalPreguntas}</td>
        <td class="ok">${r.correctas}</td>
        <td class="fail">${r.incorrectas}</td>
        <td><span class="badge" style="background:${this.pctColor(r.porcentaje)}">${r.porcentaje}%</span></td>
        <td>${r.comodines}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reporte — ${escapeHtml(d.nombreSala)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; color:#1E293B; background:#fff; padding:32px 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1D2667; padding-bottom:16px; margin-bottom:24px; }
  .header h1 { font-size:22px; font-weight:700; color:#1D2667; }
  .header .meta { font-size:11px; color:#64748B; text-align:right; line-height:1.7; }
  .kpis { display:flex; gap:16px; margin-bottom:28px; }
  .kpi { flex:1; background:#F1F5F9; border-radius:8px; padding:14px 16px; }
  .kpi .val { font-size:24px; font-weight:700; color:#1D2667; }
  .kpi .lbl { font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
  h2 { font-size:13px; font-weight:700; color:#1D2667; text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#1D2667; color:#fff; padding:9px 12px; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:.06em; }
  td { padding:9px 12px; border-bottom:1px solid #E2E8F0; }
  tr.even td { background:#F8FAFC; }
  .ok { color:#16a34a; font-weight:600; }
  .fail { color:#dc2626; font-weight:600; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; color:#fff; font-size:10px; font-weight:700; }
  .footer { margin-top:24px; font-size:10px; color:#94A3B8; text-align:center; border-top:1px solid #E2E8F0; padding-top:12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Reporte de Rendimiento</h1>
      <p style="font-size:14px;color:#64748B;margin-top:4px">${escapeHtml(d.nombreSala)}</p>
    </div>
    <div class="meta">
      <div>Docente: ${escapeHtml(d.docente)}</div>
      <div>Fecha: ${fecha}</div>
      <div>Rondas: ${d.resumenGeneral.totalRondas} · Participantes: ${d.resumenGeneral.participantes.length}</div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="val">${d.resumenGeneral.porcentajeGlobal}%</div><div class="lbl">Promedio global</div></div>
    <div class="kpi"><div class="val">${d.resumenGeneral.totalCorrectas}</div><div class="lbl">Respuestas correctas</div></div>
    <div class="kpi"><div class="val">${d.resumenGeneral.totalIncorrectas}</div><div class="lbl">Respuestas incorrectas</div></div>
    <div class="kpi"><div class="val">${d.resumenGeneral.totalPreguntasRespondidas}</div><div class="lbl">Total respondidas</div></div>
  </div>
  <h2>Tabla de rendimiento por participante</h2>
  <table>
    <thead><tr><th>#</th><th>Participante</th><th>Rondas</th><th>Preguntas</th><th>✓ Correctas</th><th>✗ Incorrectas</th><th>% Acierto</th><th>Comodines</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">Generado el ${new Date().toLocaleString('es-EC')} · Sistema de Evaluación UPSE</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
        this.exporting.set(null);
      };
    } else {
      this.downloadFile(html, `reporte_${d.nombreSala.replace(/\s+/g, '_')}.html`, 'text/html');
      this.exporting.set(null);
    }
  }

  private pctColor(pct: number): string {
    if (pct >= 75) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#dc2626';
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Limpia celdas CSV para evitar problemas con comas y saltos de línea. */
function sanitizeCsvCell(val: any): string {
  if (val == null) return '';
  let s = String(val).replace(/"/g, '""');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    s = `"${s}"`;
  }
  return s;
}

/** Escapa caracteres HTML para prevenir XSS en strings interpolados. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
