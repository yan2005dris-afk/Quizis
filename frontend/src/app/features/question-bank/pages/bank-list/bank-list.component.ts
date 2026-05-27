import { Component, resource, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Database } from 'lucide-angular';
import { BancosService } from '../../../../core/services/bancos.service';
import { ButtonComponent, AlertComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-bank-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    AlertComponent,
  ],
  templateUrl: './bank-list.component.html',
  styleUrls: ['./bank-list.component.scss'],
})
export class BankListComponent {
  private readonly bancosService = inject(BancosService);

  readonly PlusIcon = Plus;
  readonly DatabaseIcon = Database;

  readonly templateFormat = signal<'json' | 'csv' | 'xlsx'>('json');

  getTotalPreguntas(): number {
    const bancos = this.bancosResource.value() || [];
    return bancos.reduce((acc, b) => acc + (b._count?.preguntas || 0), 0);
  }

  getUltimoCreado(): string {
    const bancos = this.bancosResource.value() || [];

    if (bancos.length === 0) return '—';

    const ultimo = bancos.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )[0];

    const fecha = new Date(ultimo.createdAt);

    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  }

  async downloadTemplate() {
    const format = this.templateFormat();

    switch (format) {
      case 'json':
        this.downloadJsonTemplate();
        break;

      case 'csv':
        await this.downloadCsvTemplate();
        break;

      case 'xlsx':
        await this.downloadXlsxTemplate();
        break;
    }
  }

  private getTemplateData() {
    return [
      {
        categoria: 'Plan de calidad',
        pregunta:
          '¿Cuál es una ventaja de definir responsables dentro del plan de calidad?',
        respuesta_correcta: 'B',
        feedback_incorrecto:
          'La respuesta correcta es: Evitar ambigüedad sobre quién realiza seguimiento…',
        feedback_correcto: '',
        opcion_a: 'Reemplazar las métricas.',
        opcion_b:
          'Evitar ambigüedad sobre quién realiza seguimiento o verificación.',
        opcion_c: 'Hacer el documento más largo sin utilidad.',
        opcion_d: 'Quitar autonomía a todo el equipo.',
        opcion_e: '',
      },
    ];
  }

  private downloadJsonTemplate() {
    const data = [
      {
        texto:
          '¿Cuál es una ventaja de definir responsables dentro del plan de calidad?',
        opciones: [
          { texto: 'Reemplazar las métricas.', esCorrecta: false },
          {
            texto:
              'Evitar ambigüedad sobre quién realiza seguimiento o verificación.',
            esCorrecta: true,
          },
          {
            texto: 'Hacer el documento más largo sin utilidad.',
            esCorrecta: false,
          },
          {
            texto: 'Quitar autonomía a todo el equipo.',
            esCorrecta: false,
          },
        ],
        categoria: 'Plan de calidad',
        feedbackCorrecto: '',
        feedbackIncorrecto:
          'La respuesta correcta es: Evitar ambigüedad sobre quién realiza seguimiento…',
      },
    ];

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2),
    )}`;

    this.triggerDownload(
      jsonString,
      'plantilla_carga_masiva.json',
    );
  }

  private async downloadCsvTemplate() {
    const { default: Papa } = await import('papaparse');

    const data = this.getTemplateData();

    const csv = Papa.unparse(data, {
      header: true,
    });

    const bom = '\uFEFF';

    const blob = new Blob([bom + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    this.triggerDownload(
      url,
      'plantilla_carga_masiva.csv',
    );

    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private async downloadXlsxTemplate() {
    const XLSX = await import('xlsx');

    const data = this.getTemplateData();

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 },
      { wch: 55 },
      { wch: 6 },
      { wch: 50 },
      { wch: 40 },
      { wch: 30 },
      { wch: 50 },
      { wch: 35 },
      { wch: 30 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Preguntas',
    );

    XLSX.writeFile(
      wb,
      'plantilla_carga_masiva.xlsx',
    );
  }

  private triggerDownload(
    url: string,
    filename: string,
  ) {
    const anchor = document.createElement('a');

    anchor.setAttribute('href', url);
    anchor.setAttribute('download', filename);

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();
  }

  bancosResource = resource({
    loader: () => {
      return new Promise<any[]>((resolve, reject) => {
        this.bancosService.getAllBancos().subscribe({
          next: resolve,
          error: reject,
        });
      });
    },
  });
}