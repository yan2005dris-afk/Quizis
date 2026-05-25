import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type State = 'idle' | 'selected' | 'revealed';

@Component({
  selector: 'app-quiz-animation-demo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-animation-demo.component.html',
  styleUrls: ['./quiz-animation-demo.component.scss'],
})
export class QuizAnimationDemoComponent {

  questionNumber = 3;
  totalQuestions = 20;

  timeLeft = 30;
  prize = '$5,000';

  question = '¿Cuál es la capital de Ecuador?';
  options = ['Quito', 'Guayaquil', 'Cuenca', 'Manta'];

  selectedOption: string | null = null;

  // 🔥 nuevo estado más claro
  state: State = 'idle';

  correctAnswer = 'Quito'; // 👈 FIJO (mejor que random)

  selectOption(opt: string) {
    if (this.state === 'revealed') return; 

    this.selectedOption = opt;
    this.state = 'selected';
    
  }

  confirmAnswer() {
    if (!this.selectedOption) return;
     if (this.state === 'revealed') return;

    this.state = 'revealed';

    setTimeout(() => {
      this.resetQuestion();
    }, 2500);
  }

  isCorrect(opt: string) {
    return opt === this.correctAnswer;
  }

  isWrongSelected(opt: string) {
    return this.state === 'revealed'
      && this.selectedOption === opt
      && opt !== this.correctAnswer;
  }

  isCorrectSelected(opt: string) {
    return this.state === 'revealed'
      && opt === this.correctAnswer;
  }

  resetQuestion() {
    this.selectedOption = null;
    this.state = 'idle';
    this.timeLeft = 30;
  }

  useFifty() {
    alert('50/50 activado');
  }

  useAudience() {
    alert('Público activado');
  }

  useCall() {
    alert('Llamada activada');
  }
  
}