import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BancosService, Opcion } from '../../../../core/services/bancos.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ButtonComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-bank-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent],
  templateUrl: './bank-detail.component.html',
  styleUrls: ['./bank-detail.component.scss']
})
export class BankDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bancosService = inject(BancosService);

  currentQuestionIndex = signal(0);
  isEditing = signal(false);

  banco = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        return this.bancosService.getBancoById(Number(id)).pipe(
          tap(() => {
            this.currentQuestionIndex.set(0);
            this.isEditing.set(false);
          }),
          catchError(() => of(null))
        );
      })
    )
  );

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
      this.currentQuestionIndex.update(i => i + 1);
      this.isEditing.set(false);
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
      this.isEditing.set(false);
    }
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
  }

  toggleCorrectOption(opcion: Opcion) {
    if (!this.isEditing()) return;
    opcion.esCorrecta = !opcion.esCorrecta;
  }

  saveQuestion() {
    this.isEditing.set(false);
    console.log('Guardado:', this.currentQuestion());
    // Lógica de API para guardar acá
  }
}
