# Guía de Pruebas: Salas y Rondas (Postman / cURL)

Esta guía te permite probar manualmente el flujo completo de los módulos **Salas** y **Rondas** utilizando Postman (importando los cURL) o tu cliente REST favorito.

## 1. Obtener Token de Administrador (Login)

Primero, necesitas obtener un token JWT válido iniciando sesión con un usuario Administrador.

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@quizis.com",
  "contrasenia": "password123"
}
```

> **Nota para Postman:** Copia el valor de `accessToken` que devuelve esta petición. En las siguientes peticiones, ve a la pestaña **Authorization**, selecciona **Bearer Token** y pégalo ahí.

---

## 2. Crear una Sala de Juego

Como docente (Admin), vas a crear una sala a partir de un banco de preguntas existente.
*Asegúrate de tener un banco de preguntas válido en tu base de datos (ej. `bancoId: 1`).*

**Request:**
```http
POST http://localhost:3000/api/salas
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "bancoId": 1,
  "nombre": "Examen Final - Calidad de Software",
  "limitePreguntas": 20
}
```

**Respuesta Esperada:**
```json
{
  "salaId": 1,
  "adminId": 1,
  "bancoId": 1,
  "nombre": "Examen Final - Calidad de Software",
  "tokenCompartido": "uuid-v4...",
  "codigoPin": "UPSE-742",
  "estado": "BORRADOR",
  "limitePreguntas": 20,
  "createdAt": "2026-05-24T..."
}
```

---

## 3. Cambiar el Estado de la Sala (FSM)

El docente abre la sala para que los estudiantes comiencen a entrar. La máquina de estados permite pasar de `BORRADOR` a `ESPERANDO_ALUMNOS`.

**Request:**
```http
PATCH http://localhost:3000/api/salas/1/estado
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "estado": "ESPERANDO_ALUMNOS"
}
```

> **Prueba de Error (Opcional):** Intenta enviar `"estado": "FINALIZADO"`. Debería arrojarte un error `400 Bad Request` indicando que la transición no está permitida desde `BORRADOR`.

---

## 4. Crear una Ronda (Asignación Aleatoria)

Cuando un estudiante entra a la sala, se le genera su intento (Ronda). El sistema elegirá preguntas de forma aleatoria exclusivamente para él.

**Request:**
```http
POST http://localhost:3000/api/rondas
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "salaId": 1,
  "participanteId": 5,
  "numeroRonda": 1
}
```

**Respuesta Esperada:**
```json
{
  "rondaId": 1,
  "salaId": 1,
  "participanteId": 5,
  "numeroRonda": 1,
  "estado": "pendiente",
  "preguntasAsignadas": [
    12, 
    4, 
    18, 
    7, 
    2
  ],
  "createdAt": "2026-05-24T..."
}
```
> **Tip:** El arreglo `preguntasAsignadas` variará en cada petición gracias al algoritmo PostgreSQL `ORDER BY RANDOM()`. Si haces esta misma petición para el `participanteId: 6`, verás que el orden y las preguntas son diferentes.
