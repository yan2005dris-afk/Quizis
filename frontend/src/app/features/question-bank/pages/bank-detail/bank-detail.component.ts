import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BancosService, Opcion, BancoPreguntasDetalle } from '../../../../core/services/bancos.service';
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

@Component({
  selector: 'app-bank-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent, AlertComponent],
  templateUrl: './bank-detail.component.html',
  styleUrls: ['./bank-detail.component.scss'],
})
export class BankDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bancosService = inject(BancosService);
  private readonly toastService = inject(ToastService);

  currentQuestionIndex = signal(0);
  isEditing = signal(false);
  isSaving = signal(false);

  private readonly refresh$ = new Subject<void>();

  state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of({ data: null, error: false, loading: false } as BankState);

        return this.refresh$.pipe(
          startWith(void 0),
          switchMap(() =>
            this.bancosService.getBancoById(Number(id)).pipe(
              map((data) => ({ data, error: false, loading: false } as BankState)),
              tap(() => {
                this.isEditing.set(false);
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
    const b = this.banco();
    if (!b || !b.preguntas || b.preguntas.length === 0) return null;
    return b.preguntas[this.currentQuestionIndex()];
  });

  totalQuestions = computed(() => {
    const b = this.banco();
    return b?.preguntas?.length || 0;
  });

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

  saveQuestion() {
    const question = this.currentQuestion();
    const banco = this.banco();
    if (!question || !banco || this.isSaving()) return;

    this.isSaving.set(true);

    // Limpiamos el objeto para mandar solo lo que el DTO espera
    const cleanQuestion = {
      texto: question.texto,
      categoria: question.categoria,
      nivel: question.nivel,
      monto: question.monto,
      feedbackCorrecto: question.feedbackCorrecto,
      feedbackIncorrecto: question.feedbackIncorrecto,
      tiempoLimite: question.tiempoLimite,
      opciones: question.opciones.map((o) => ({
        texto: o.texto,
        esCorrecta: o.esCorrecta,
      })),
    };

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
}
