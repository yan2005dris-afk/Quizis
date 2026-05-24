import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // 👈 Importamos la herramienta para manejar inputs

@Component({
  selector: 'app-login-audiencia',
  standalone: true, // Asegurémonos de que esté marcado como standalone si no lo estaba
  imports: [FormsModule], // 👈 Le avisamos al componente que usaremos formularios
  templateUrl: './login-audiencia.html',
  styleUrl: './login-audiencia.scss',
})
export class LoginAudiencia {
  // 1. Creamos las variables de Java/TypeScript para guardar los textos
  pinSala: string = '';
  nombreAlumno: string = '';

  // 2. Creamos la función que se ejecutará cuando el alumno dé clic al botón
  ingresarALaSala() {
    // Por ahora, como no tenemos el backend de Gino listo, simularemos la acción con un mensaje en consola
    if (this.pinSala.trim() === '' || this.nombreAlumno.trim() === '') {
      alert('¡Por favor, completa todos los campos antes de jugar!');
      return;
    }

    console.log('--- Datos capturados con éxito ---');
    console.log('PIN de la Sala:', this.pinSala);
    console.log('Nombre del Alumno:', this.nombreAlumno);
    
    alert(`¡Conectando a la sala ${this.pinSala} como ${this.nombreAlumno}! (Simulación de Frontend lista)`);
  }
}