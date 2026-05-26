import { Component, resource, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Database } from 'lucide-angular';
import { BancosService } from '../../../../core/services/bancos.service';
import { ButtonComponent, AlertComponent } from '../../../../shared/ui';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

@Component({
  selector: 'app-bank-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, ButtonComponent, AlertComponent],
  templateUrl: './bank-list.component.html',
  styleUrls: ['./bank-list.component.scss'],
})
export class BankListComponent {
  private readonly bancosService = inject(BancosService);

  readonly PlusIcon = Plus;
  readonly DatabaseIcon = Database;

  // ── Template download ─────────────────────────────
  readonly templateFormat = signal<'json' | 'csv' | 'xlsx'>('json');

  downloadTemplate() {
    const format = this.templateFormat();

    switch (format) {
      case 'json':
        this.downloadJsonTemplate();
        break;
      case 'csv':
        this.downloadCsvTemplate();
        break;
      case 'xlsx':
        this.downloadXlsxTemplate();
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
    const data = this.getTemplateData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2),
    )}`;
    this.triggerDownload(jsonString, 'plantilla_carga_masiva.json');
  }

  private downloadCsvTemplate() {
    const data = this.getTemplateData();
    const csv = Papa.unparse(data, { header: true });
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, 'plantilla_carga_masiva.csv');
    URL.revokeObjectURL(url);
  }

  private downloadXlsxTemplate() {
    const data = this.getTemplateData();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 }, // categoria
      { wch: 55 }, // pregunta
      { wch: 6 },  // respuesta_correcta
      { wch: 50 }, // feedback_incorrecto
      { wch: 40 }, // feedback_correcto
      { wch: 30 }, // opcion_a
      { wch: 50 }, // opcion_b
      { wch: 35 }, // opcion_c
      { wch: 30 }, // opcion_d
      { wch: 20 }, // opcion_e
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
    XLSX.writeFile(wb, 'plantilla_carga_masiva.xlsx');
  }

  private triggerDownload(url: string, filename: string) {
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
