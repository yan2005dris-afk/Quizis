# Quizis — ¿Quién quiere ser millonario?

Sistema interactivo de quizzes estilo "¿Quién quiere ser millonario?" con salas en tiempo real, roles definidos y sistema de comodines.

## Stack

| Capa                    | Tecnología                                  |
| ----------------------- | ------------------------------------------- |
| **Frontend**            | Angular 21 (Standalone Components, Signals) |
| **Backend**             | NestJS 11                                   |
| **Base de datos**       | PostgreSQL 16                               |
| **Cache / Tiempo real** | Redis (Pub/Sub + estado de partida)         |
| **Auth (solo admin)**   | JWT (Access + Refresh tokens)               |
| **Acceso público**      | Token de sala único + nickname              |
| **Infra**               | Docker Compose                              |

## Roles

| Rol                         | Descripción                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin / Ingeniero**       | Crea la sala, sube las preguntas, elige al encuestado, configura los comodines habilitados                                           |
| **Encuestado / Estudiante** | Juega la partida: responde preguntas, decide cuándo usar comodines. Entra con link público y elige su nickname.                      |
| **Observador**              | Se suscribe a la sala en vivo, puede participar en comodines como "pregunta al público". Entra con link público y elige su nickname. |

## Flujo del juego

```
 1. Admin se logea y crea una sala
 2. Admin sube el banco de preguntas (ej: 100 preguntas en JSON)
 3. Admin configura:
    - Límite de preguntas por ronda (ej: 20)
    - Comodines habilitados (true/false)
 4. Admin comparte el link único de la sala (contiene token de sala)
 5. Los participantes entran al link, ponen su nickname y se unen como observadores
 6. Admin elige un estudiante de los observadores como encuestado
 7. Comienza la ronda — el estudiante responde las N preguntas configuradas
 8. El estudiante usa comodines durante su ronda según lo habilitado
 9. Al completar las N preguntas, la ronda termina
10. Admin puede iniciar una NUEVA ronda con otro estudiante (reinicia desde la pregunta 1)
11. El proceso se repite hasta que el admin cierra la sala
```

## Comodines

Cada comodín se configura como booleano (habilitado/deshabilitado) por partida:

| Comodín                    | Descripción                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🗳️ Pregunta al público** | Los observadores suscriptos votan por una opción. La más votada se muestra como sugerencia.                                                                      |
| **🤖 Respuesta por IA**    | El sistema consulta una IA (vía API key configurada) y devuelve una respuesta sugerida.                                                                          |
| **📞 Llamada**             | El estudiante elige un observador de la lista de conectados; ese observador recibe notificación y sugiere una respuesta; el estudiante confirma si la toma o no. |

## Requerimientos funcionales

### Autenticación (solo admin)

- Login de admin con JWT (Access + Refresh tokens)
- El admin se registra una sola vez (seed o registro inicial)
- Los participantes (estudiantes y observadores) **NO necesitan cuenta**
- Entran a la sala mediante un link compartido que contiene un token único de sala
- Al unirse solo ingresan su nickname — no hay contraseña, no hay registro

### Gestión de salas (Admin)

- Login protegido con JWT
- Crear sala con nombre y configuración
- Subir archivo de preguntas (JSON principalmente, parser extensible)
- Visualizar preguntas cargadas antes de iniciar
- Compartir link único de sala (contiene token no predecible) para que cualquiera entre sin login
- Ver participantes conectados (nickname + rol) en tiempo real
- Elegir estudiante encuestado de la lista de observadores
- Configurar qué comodines están habilitados (true/false cada uno)
- Configurar límite de preguntas por ronda (ej: sacar 20 de 100)
- Iniciar ronda, ver progreso del estudiante en vivo
- Al completar la ronda: iniciar nueva ronda con otro estudiante (reinicia desde pregunta 1)
- Opcional: marcar preguntas usadas para que no se repitan entre rondas
- Finalizar la sala cuando ya no haya más rondas

### Ingreso de participantes (sin autenticación)

- El frontend expone una ruta pública tipo `/room/:token`
- Al entrar, el usuario ingresa su nickname (obligatorio, único en la sala)
- Se asigna rol de observador por defecto
- El admin puede promocionar a encuestado desde el panel
- La identidad del participante vive en sesión WebSocket + Redis — no se persiste en PostgreSQL

### Rondas secuenciales (reintento con nuevo estudiante)

- El admin sube un banco de preguntas (ej: 100) y configura un **límite por ronda** (ej: 20)
- Cada estudiante encuestado responde **todas las preguntas de la ronda** (de la 1 a la N)
- Cuando el estudiante completa la ronda, la sala queda disponible para una **nueva ronda**
- El admin puede elegir OTRO estudiante de los observadores y comenzar una ronda nueva desde la pregunta 1 del banco
- El nuevo estudiante empieza fresco — las preguntas se vuelven a mostrar
- Los comodines se resetean para cada ronda (cada estudiante tiene sus 3 comodines disponibles)
- El admin puede cambiar la configuración entre rondas (cantidad de preguntas, comodines habilitados)
- **Opcional**: el admin puede configurar que las preguntas ya usadas en rondas anteriores se excluyan, forzando que cada ronda use preguntas distintas del banco

### Sala en vivo (WebSocket + Redis Pub/Sub)

- Conexión vía WebSocket autenticada por token de sala + nickname
- Suscripción a sala como observador (rol por defecto)
- Estado de la sala en tiempo real (ronda actual, pregunta actual, progreso del estudiante)
- El admin ve el panel de control: lista de participantes, rondas completadas, iniciar nueva ronda
- El estudiante ve la pregunta y las opciones
- El estudiante envía su respuesta
- El estudiante activa comodines
- Los observadores ven el progreso en vivo
- Cuando cambia la ronda (nuevo estudiante), todos reciben el evento con los datos del nuevo encuestado

### Comodines en tiempo real

- **Pregunta al público**: los observadores votan, se muestra resultado en vivo
- **Respuesta por IA**: llamada a API externa, se muestra sugerencia
- **Llamada**: el estudiante selecciona un observador de la lista de conectados, éste recibe notificación en su pantalla y sugiere una respuesta

### Resultados e historial

- Guardar partida completa (preguntas, respuestas, comodines usados, resultado final, nickname del estudiante)
- Historial de partidas por nickname (trazable aunque no haya cuenta)
- Reporte básico para el admin (cuántos jugaron, quién ganó, reintentos, etc.)

## Requerimientos no funcionales

- **Tiempo real**: WebSockets con Redis Pub/Sub para estado de sala vivo
- **Persistencia**: PostgreSQL para datos duraderos (usuarios, quizzes, historial)
- **Cache**: Redis para estado efímero de partida activa, sesiones WebSocket, votos
- **Escalabilidad**: Backend stateless (el estado vivo vive en Redis, no en memoria de la instancia)
- **Formato de preguntas**: JSON como formato primario; parser extensible por si se quiere soportar CSV, Excel, etc.

## Modelo de datos preliminar

### Entidades principales

- **Admin**: id, email, nombre, password hash (único — solo el admin se autentica)
- **Room**: id, admin_id, nombre, token_compartido (UUID único para el link público), estado (waiting | playing | finished), config (limite_preguntas, comodines habilitados {publico, ia, llamada})
- **Question**: id, room_id, texto, opciones[], respuesta_correcta, nivel/monto
- **Round**: id, room_id, numero_ronda, participant_id (nickname), preguntas_asignadas[], estado (pending | playing | completed | cancelled), fecha_inicio, fecha_fin
- **RoundAnswer**: id, round_id, question_id, participant_id, respuesta_elegida, correcta, comodin_usado, timestamp
- **AudienceVote**: id, round_id, question_id, participant_id (nickname), opcion_votada (efímero en Redis, persistir al finalizar)

> Los participantes (estudiantes, observadores) **no tienen cuenta**. Su identidad es el nickname que eligen al unirse, asociado a su sesión WebSocket. El historial de partidas se guarda con el nickname para mantener trazabilidad sin requerir registro.

## Cómo arrancar

```bash
# Clonar e instalar (desde la raíz del monorepo)
git clone <repo-url>
cd Quizis

# Infraestructura
docker compose up -d --build

# Backend (dev)
pnpm --filter backend run start:dev

# Frontend (dev)
pnpm --filter frontend run start
```

## Convenciones del proyecto

- Backend: NestJS con módulos feature (auth, rooms, quiz, ws)
- Frontend: Angular standalone components, Signals para estado reactivo
- Commits: Conventional Commits
- Package manager: **pnpm workspaces** (monorepo en la raíz)
- Tiempo real: WebSockets vía `@nestjs/platform-socket.io` + `socket.io-client`
