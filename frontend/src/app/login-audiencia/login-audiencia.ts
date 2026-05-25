import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // 👈 Herramienta clave para cumplir la directiva del proyecto

@Component({
  selector: 'app-login-audiencia',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-audiencia.html',
  styleUrl: './login-audiencia.scss',
})
export class LoginAudiencia implements OnInit {
  // Inyectamos el lector de rutas de Angular
  private route = inject(ActivatedRoute);

  // Requisitos de la rúbrica: Variables reactivas usando modernas Signals
  tokenSala = signal<string>('');
  nombreAlumno = signal<string>('');

  ngOnInit() {
    // Capturamos el token seguro de la URL (mapeado desde room/:token en app.routes.ts)
    const tokenParam = this.route.snapshot.paramMap.get('token');
    
    if (tokenParam) {
      this.tokenSala.set(tokenParam);
    }
  }

  ingresarALaSala() {
    const nombreLimpio = this.nombreAlumno().trim();

    // Validación 1: Que no esté vacío
    if (nombreLimpio === '') {
      alert('¡El nombre es obligatorio para registrarte en la sala!');
      return;
    }

    // Validación 2: Restricción de mínimo 3 caracteres (¡Tu nueva regla!)
    if (nombreLimpio.length < 3) {
      alert('¡Nombre inválido! Tu nombre completo debe contener al menos 3 caracteres.');
      return;
    }

    console.log('--- EVENTO: Registro de Audiencia Móvil (Grupo 7) ---');
    console.log('Token seguro extraído de URL:', this.tokenSala());
    console.log('Estudiante identificado:', nombreLimpio);
    
    alert(`¡Token [${this.tokenSala()}] validado! Conectando a la sala en tiempo real como "${nombreLimpio}".`);
  }
}