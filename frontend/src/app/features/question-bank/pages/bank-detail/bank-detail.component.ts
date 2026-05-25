import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface QuestionPreview {
  questionText: string;
  options: string[];
  correctAnswer: string;
  isValid: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-bank-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bank-detail.component.html',
  styleUrls: ['./bank-detail.component.scss']
})
export class BankDetailComponent {
 
  
  isDragging = false;
  showModal = false;
  loadedFile: File | null = null;

  parsedQuestions: QuestionPreview[] = [];
  validQuestions: QuestionPreview[] = [];
  invalidQuestions: QuestionPreview[] = [];

  constructor() {}

  // --- Lógica de Descarga de Plantilla ---
  downloadTemplate() {
    const templateStructure = [
      {
        questionText: "Escribe aquí la pregunta o enunciado",
        options: [
          "Opción A (Respuesta correcta)",
          "Opción B",
          "Opción C",
          "Opción D"
        ],
        correctAnswer: "Opción A (Respuesta correcta)",
        isValid: true
      },
      {
        questionText: "¿Cuál es la sintaxis correcta para un decorador en TypeScript?",
        options: [
          "@Component",
          "#Component",
          "def Component",
          "component()"
        ],
        correctAnswer: "@Component",
        isValid: true
      }
    ];

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(templateStructure, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'plantilla_carga_masiva.json');
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // --- Lógica del Drag & Drop ---
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  // --- Procesar y Retener en Frontend ---
  handleFile(file: File) {
    this.loadedFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      this.parseAndValidateData(content);
    };
    reader.readAsText(file);
  }

  parseAndValidateData(rawContent: any) {
    this.parsedQuestions = [
      {
        questionText: '¿Cuál es la sintaxis correcta para un decorador en TypeScript?',
        options: ['@Component', '#Component', 'def Component', 'component()'],
        correctAnswer: '@Component',
        isValid: true
      },
      {
        questionText: 'Pregunta incompleta mal formateada',
        options: ['Opción A', 'Opción B'],
        correctAnswer: 'Opción A',
        isValid: false,
        errorMessage: 'Debe contener exactamente 4 opciones de respuesta.'
      }
    ];

    this.validQuestions = this.parsedQuestions.filter(q => q.isValid);
    this.invalidQuestions = this.parsedQuestions.filter(q => !q.isValid);
  }

  clearFile() {
    this.loadedFile = null;
    this.parsedQuestions = [];
    this.validQuestions = [];
    this.invalidQuestions = [];
  }

  // --- Lógica del Modal de Previsualización ---
  openPreviewModal() {
    if (this.parsedQuestions.length > 0) {
      this.showModal = true;
    }
  }

  closePreviewModal() {
    this.showModal = false;
  }

  // --- Persistencia Final (Solo los datos limpios al Backend) ---
  saveToBackend() {
    const payloadData = this.validQuestions.map(q => ({
      text: q.questionText,
      options: q.options,
      answer: q.correctAnswer
    }));

    console.log('Enviando datos limpios al backend:', payloadData);
    
    this.closePreviewModal();
    this.clearFile();
  }

  currentPage = signal<number>(0);
  totalPages = signal<number>(1);
  totalQuestions = signal<number>(0);
  currentQuestionIndex = signal<number>(0);
  currentQuestion = signal<any>(null);
  parseResult = signal<any>({ total: 0 });

  isImporting = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  resetFileUpload() {
    this.clearFile();
  }

  canConfirmImport(): boolean {
    return this.validQuestions.length > 0;
  }

  confirmImport() {
    this.saveToBackend();
  }

  isNewBank(): boolean {
    return true;
  }

  addManualQuestion() {}
  prevQuestion() {}
  nextQuestion() {}
  toggleEdit() {}
  saveQuestion() {}
}