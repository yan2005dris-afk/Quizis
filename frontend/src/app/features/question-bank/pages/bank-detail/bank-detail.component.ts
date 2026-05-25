import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BancosService,
  Opcion,
  BancoPreguntasDetalle,
} from '../../../../core/services/bancos.service';
import { FileParserService, type ParseResult } from '../../../../core/services/file-parser.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, tap, map, startWith } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { ButtonComponent, AlertComponent } from '../../../../shared/ui';
import { ToastService } from '../../../../core/services/toast.service';

interface BankState {
  data: BancoPreguntasDetalle | null;
  error: boolean;
  loading: boolean;
}

const initialBankState: BankState = { data: null, error: false, loading: true };
const PAGE_SIZE = 10;

@Component({
  selector: 'app-bank-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent, AlertComponent],
  templateUrl: './bank-detail.component.html',
  styleUrls: ['./bank-detail.component.scss'],
})
export class BankDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bancosService = inject(BancosService);
  private readonly fileParserService = inject(FileParserService);
  private readonly toastService = inject(ToastService);

  readonly pageSize = PAGE_SIZE;

  // ── Bank metadata editing ──────────────────────────
  isEditingBank = signal(false);
  isSavingBank = signal(false);
  bankName = signal('');
  bankDesc = signal('');

  // ── Question editing state ─────────────────────────
  currentQuestionIndex = signal(0);
  isEditing = signal(false);
  isSaving = signal(false);

  // ── Pending questions for new bank ─────────────────
  pendingPreguntas = signal<any[]>([]);

  private readonly refresh$ = new Subject<void>();

  // ── File upload state ───────────────────────────────
  readonly selectedFile = signal<File | null>(null);
  readonly isParsing = signal(false);
  readonly parseResult = signal<ParseResult | null>(null);
  readonly parseError = signal('');
  readonly currentPage = signal(0);
  readonly isImporting = signal(false);

  readonly totalPages = computed(() => {
    const total = this.parseResult()?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  });

  readonly paginatedPreguntas = computed(() => {
    const preguntas = this.parseResult()?.preguntas ?? [];
    const start = this.currentPage() * PAGE_SIZE;
    return preguntas.slice(start, start + PAGE_SIZE);
  });

  readonly hasParseErrors = computed(
    () => (this.parseResult()?.errores?.length ?? 0) > 0,
  );

  readonly canConfirmImport = computed(() =>
    this.parseResult() !== null &&
    (this.parseResult()?.preguntas?.length ?? 0) > 0 &&
    !this.isImporting(),
  );

  readonly fileLabel = computed(() => {
    const f = this.selectedFile();
    return f ? f.name : 'Ningún archivo seleccionado';
  });

  readonly bancoId = signal(0);
  readonly isNewBank = signal(false);

  // ── Banco data stream ──────────────────────────────
  state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        
        if (!id || id === 'crear') {
          this.isNewBank.set(true);
          this.isEditingBank.set(true);
          this.bancoId.set(0);
          this.bankName.set('');
          this.bankDesc.set('');
          this.pendingPreguntas.set([]);
          return of({ data: null, error: false, loading: false } as BankState);
        }

        this.isNewBank.set(false);
        this.bancoId.set(Number(id));

        return this.refresh$.pipe(
          startWith(void 0),
          switchMap(() =>
            this.bancosService.getBancoById(Number(id)).pipe(
              map((data) => ({ data, error: false, loading: false }) as BankState),
              tap((res) => {
                if (res.data) {
                  this.bankName.set(res.data.nombre);
                  this.bankDesc.set(res.data.descripcion || '');
                }
                this.isEditing.set(false);
                this.isEditingBank.set(false);
              }),
              catchError(() => of({ data: null, error: true, loading: false } as BankState)),
            ),
          ),
          startWith(initialBankState),
        );
      }),
    ),
    { initialValue: initialBankState },
  );

  banco = computed(() => this.state().data);
  isLoading = computed(() => this.state().loading);
  error = computed(() => this.state().error);

  currentQuestion = computed(() => {
    if (this.isNewBank()) {
      const pending = this.pendingPreguntas();
      if (pending.length === 0) return null;
      return pending[this.currentQuestionIndex()];
    }

    const b = this.banco();
    if (!b || !b.preguntas || b.preguntas.length === 0) return null;
    return b.preguntas[this.currentQuestionIndex()];
  });

  totalQuestions = computed(() => {
    if (this.isNewBank()) {
      return this.pendingPreguntas().length;
    }
    const b = this.banco();
    return b?.preguntas?.length || 0;
  });

  // ── Metadata actions ───────────────────────────────
  toggleEditBank() {
    if (this.isNewBank()) return; 
    this.isEditingBank.update(v => !v);
    if (!this.isEditingBank()) {
      const b = this.banco();
      if (b) {
        this.bankName.set(b.nombre);
        this.bankDesc.set(b.descripcion || '');
      }
    }
  }

  saveBank() {
    const name = this.bankName().trim();
    if (!name) return;

    this.isSavingBank.set(true);

    if (this.isNewBank()) {
      const preguntas = this.pendingPreguntas().map(p => ({
        texto: p.texto,
        categoria: p.categoria,
        nivel: p.nivel,
        monto: p.monto,
        feedbackCorrecto: p.feedbackCorrecto,
        feedbackIncorrecto: p.feedbackIncorrecto,
        tiempoLimite: p.tiempoLimite,
        opciones: p.opciones.map((o: any) => ({
          texto: o.texto,
          esCorrecta: o.esCorrecta
        }))
      }));

      this.bancosService.createBanco(name, this.bankDesc().trim() || undefined, preguntas).subscribe({
        next: (res: any) => {
          this.isSavingBank.set(false);
          this.toastService.show('Banco creado exitosamente con sus preguntas', 'success', '¡Éxito!');
          this.router.navigate(['/bancos', res.bancoId]);
        },
        error: () => {
          this.isSavingBank.set(false);
          this.toastService.show('Error al crear el banco', 'danger', 'Error');
        }
      });
    } else {
      this.bancosService.updateBanco(this.bancoId(), {
        nombre: name,
        descripcion: this.bankDesc().trim() || '',
      }).subscribe({
        next: () => {
          this.isSavingBank.set(false);
          this.isEditingBank.set(false);
          this.toastService.show('Información actualizada', 'success', '¡Éxito!');
          this.refresh$.next();
        },
        error: () => {
          this.isSavingBank.set(false);
          this.toastService.show('Error al actualizar la información', 'danger', 'Error');
        }
      });
    }
  }

  // ── Question navigation ────────────────────────────
  nextQuestion() {
    if (this.currentQuestionIndex() < this.totalQuestions() - 1) {
      this.currentQuestionIndex.update((i) => i + 1);
      this.isEditing.set(false);
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update((i) => i - 1);
      this.isEditing.set(false);
    }
  }

  toggleEdit() {
    this.isEditing.update((v) => !v);
  }

  toggleCorrectOption(opcion: Opcion) {
    if (!this.isEditing()) return;
    opcion.esCorrecta = !opcion.esCorrecta;
  }

  addManualQuestion() {
    const newQ = {
      texto: 'Nueva pregunta',
      nivel: 1,
      tiempoLimite: 30,
      opciones: [
        { texto: 'Opción 1', esCorrecta: true },
        { texto: 'Opción 2', esCorrecta: false },
        { texto: 'Opción 3', esCorrecta: false },
        { texto: 'Opción 4', esCorrecta: false },
      ],
    };

    if (this.isNewBank()) {
      this.pendingPreguntas.update((p) => [...p, newQ]);
      this.currentQuestionIndex.set(this.pendingPreguntas().length - 1);
      this.isEditing.set(true);
    } else {
      this.pendingPreguntas.set([newQ]);
      this.crearPreguntasManualmente();
    }
  }

  private crearPreguntasManualmente() {
    const banco = this.banco();
    if (!banco) return;

    this.isImporting.set(true);
    this.bancosService.crearPreguntas(banco.bancoId, this.pendingPreguntas()).subscribe({
      next: () => {
        this.isImporting.set(false);
        this.pendingPreguntas.set([]);
        this.refresh$.next();
        this.toastService.show('Pregunta agregada', 'success', '¡Éxito!');
      },
      error: () => {
        this.isImporting.set(false);
        this.toastService.show('Error al agregar pregunta', 'danger', 'Error');
      }
    });
  }

  saveQuestion() {
    const question = this.currentQuestion();
    if (!question || this.isSaving()) return;

    const cleanQuestion = {
      texto: question.texto,
      categoria: question.categoria,
      nivel: question.nivel,
      monto: question.monto,
      feedbackCorrecto: question.feedbackCorrecto,
      feedbackIncorrecto: question.feedbackIncorrecto,
      tiempoLimite: question.tiempoLimite,
      opciones: question.opciones.map((o: any) => ({
        texto: o.texto,
        esCorrecta: o.esCorrecta,
      })),
    };

    if (this.isNewBank()) {
      this.pendingPreguntas.update((prev) => {
        const updated = [...prev];
        updated[this.currentQuestionIndex()] = {
          ...updated[this.currentQuestionIndex()],
          ...cleanQuestion
        };
        return updated;
      });
      this.isEditing.set(false);
      this.toastService.show('Pregunta actualizada en memoria', 'info', 'Pendiente de guardar');
      return;
    }

    const banco = this.banco();
    if (!banco) return;

    this.isSaving.set(true);
    this.bancosService.updatePregunta(banco.bancoId, question.preguntaId, cleanQuestion).subscribe({
      next: () => {
        this.toastService.show('Pregunta actualizada correctamente', 'success', '¡Éxito!');
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.refresh$.next();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.toastService.show('Error al intentar actualizar la pregunta', 'danger', 'Error');
        this.isSaving.set(false);
      },
    });
  }

  // ── File upload handlers ───────────────────────────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;

    this.selectedFile.set(file);
    this.parseResult.set(null);
    this.parseError.set('');
    this.currentPage.set(0);
    this.parseFile(file);
  }

  private async parseFile(file: File) {
    this.isParsing.set(true);
    this.parseError.set('');

    try {
      const result = await this.fileParserService.parseFile(file);
      this.parseResult.set(result);
      this.isParsing.set(false);

      if (result.errores.length > 0) {
        this.toastService.show(
          `${result.errores.length} fila(s) con errores`,
          'warning',
          'Errores de parseo',
        );
      }
    } catch (err) {
      this.isParsing.set(false);
      this.parseError.set('Error al procesar el archivo. Intentá de nuevo.');
      this.toastService.show('Error al procesar el archivo.', 'danger', 'Error');
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  confirmImport() {
    const preguntas = this.parseResult()?.preguntas;
    if (!preguntas || preguntas.length === 0) return;

    if (this.isNewBank()) {
      this.pendingPreguntas.update((prev) => [...prev, ...preguntas]);
      this.toastService.show(
        `${preguntas.length} preguntas añadidas a la lista. Recordá guardar el banco al finalizar.`,
        'success',
        'Cargado en memoria',
      );
      this.resetFileUpload();
      return;
    }

    const bancoId = this.bancoId();
    if (!bancoId) return;

    this.isImporting.set(true);

    this.bancosService.crearPreguntas(bancoId, preguntas).subscribe({
      next: (result) => {
        this.isImporting.set(false);
        this.toastService.show(
          `${result.totalCreadas} preguntas creadas correctamente`,
          'success',
          'Importación exitosa',
        );
        this.resetFileUpload();
        this.refresh$.next();
      },
      error: (err) => {
        this.isImporting.set(false);
        let msg = 'Error al crear las preguntas. Intentá de nuevo.';
        if (err.status === 400) {
          msg = 'Datos inválidos: cada pregunta debe tener exactamente una opción correcta.';
        } else if (err.status === 404) {
          msg = 'No se encontró el banco.';
        }
        this.parseError.set(msg);
        this.toastService.show(msg, 'danger', 'Error');
      },
    });
  }

  resetFileUpload() {
    this.selectedFile.set(null);
    this.parseResult.set(null);
    this.parseError.set('');
    this.currentPage.set(0);
    const fileInput = document.querySelector<HTMLInputElement>(
      'input[type="file"]#detail-file-upload',
    );
    if (fileInput) fileInput.value = '';
  }
}
