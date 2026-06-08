# Quizis — Backlog de mejoras y correcciones

> Generado el 2026-06-03. Actualizado el 2026-06-08 tras merge de PRs #56–#59.
> Prioridades: 🔴 Alta · 🟡 Media · 🟢 Baja

---

## Índice

0. [Análisis PR #54 — Validación por consenso](#0-análisis-pr-54)
0b. [Análisis PRs #56–#59 — Timer, Progreso, Refactor cache, Fix visual](#0b-análisis-prs-5659)
1. [Correcciones (bugs / code smells)](#1-correcciones)
2. [Feature: Timer server-authoritative + visual](#2-feature-timer) ✅ Implementado
3. [Feature: Barra de progreso de preguntas](#3-feature-progreso) ✅ Implementado
4. [Feature: Feedback de pregunta — estado actual y gaps](#4-feature-feedback)
5. [Deuda técnica — complejidad alta](#5-deuda-técnica)
6. [Feature: Eliminar pregunta de banco](#6-feature-eliminar-pregunta) ✅ Implementado

---

## 0. Análisis PR #54 — Validación por consenso

> Merge: `brydyan/validacion_confirmacion_respuesta` · 2026-06-03  
> Archivos cambiados: 29 · +2158 / -171 líneas

### Qué se hizo

**Nueva feature — Validación por consenso de equipo**

En modo multi-jugador (varios estudiantes en una sala), el sistema ahora valida las respuestas
por consenso antes de darlas por definitivas. Si no hay acuerdo entre los estudiantes, la
respuesta no se confirma. Cambios clave:

| Archivo nuevo | Rol |
|---|---|
| `consensus-cache.use-case.ts` | Cache en memoria (con GC propio) que acumula los votos por sala/pregunta |
| `evaluate-consensus.use-case.ts` | Lógica de evaluación: ¿se alcanzó el umbral de acuerdo? |
| `docs/validacion-consenso-equipo.md` | Documentación del diseño |

**Schema:** `RespuestasRonda` ahora incluye `participanteId Int?` — las respuestas quedan
trazadas por participante. Antes eran anónimas por ronda.

**Frontend:** `ActiveQuestionComponent` recibió un nuevo `effect()` para reaccionar al estado
de consenso en tiempo real desde `GameSocketService`.

**Tests:** Cobertura agregada en `consensus-cache.use-case.spec.ts`,
`evaluate-consensus.use-case.spec.ts`, y actualizaciones en `submit-answer`, `join-room`,
`handle-disconnect`.

---

### Qué NO se corrigió

Ninguna de las tareas del backlog previo fue tocada en este PR. Los bugs B1–B4,
las features T1–T9, P1–P2 y F1–F3 siguen pendientes exactamente igual.

---

### Regresiones introducidas

**R1 — `ActiveQuestionComponent.constructor` — complejidad subió**

El nuevo `effect()` de consenso se agregó directamente al constructor, que ya estaba al borde
del umbral (cognitive 22). Quedó en **cognitive 24, cyclomatic 16**.

```
Antes (53b7d15): cognitive 22 · cyclomatic 15 · MI 57.2
Después (PR #54): cognitive 24 · cyclomatic 16 · MI 55.0
```

El effect debería extraerse a un método privado `_syncConsensusState()` y llamarse desde el
constructor, igual que los otros effects ya existentes en el componente.

**R2 — `GameSocketService.conectar` — creció +28 LOC**

El PR agregó más listeners de consenso dentro del método `conectar`, que ya estaba en 179 LOC.
Quedó en **207 LOC**. La deuda D2 pasa de baja a media en urgencia.

```
Antes: 179 LOC · MI 37.3 · bugs estimados Halstead: 2.03
Después: 207 LOC · MI 36.1 · bugs estimados Halstead: 2.39
```

---

### Métricas globales antes/después

| Métrica | Antes (53b7d15) | Después (PR #54) | Δ |
|---|---|---|---|
| Archivos | 378 | 382 | +4 |
| Nodos | 3,429 | 3,510 | +81 |
| Edges | 5,890 | 6,042 | +152 |
| Funciones analizadas | 673 | 692 | +19 |
| Funciones sobre umbral | 34 | 37 | **+3** |
| Cognitive máximo | 30 | 30 | = |
| MI mínimo | 17.5 | 17.5 | = |

---

---

## 0b. Análisis PRs #56–#59

> Merges: 2026-06-07 · 4 PRs sobre `develop`

### PR #56 — `brydyan/sc-23/feat-time-terminar-completar-el-timer`

**Implementó el timer completo (T1–T9).**

| Archivo | Cambio |
|---|---|
| `Salas.prisma` | Campo `tiempoLimitePregunta Int @default(30)` + migración |
| `update-configuracion-sala.dto.ts` | Expone `tiempoLimitePregunta` |
| `update-configuracion-sala.use-case.ts` | Persiste el nuevo campo |
| `juego.gateway.ts` | Timer server-authoritative con `setInterval`; emite `tiempo_agotado` y `transicion_pregunta { segundos: 3 }` |
| `game-socket.service.ts` | Escucha `tiempo_agotado` y `transicion_pregunta` |
| `timer.component.ts/html/scss` | Nuevo componente `TimerComponent` (barra circular, estados de color) |
| `question-progress.component.ts` | Primer esqueleto del componente de progreso |
| `active-question.component.html` | Reemplaza `⏱️ {{ t }}s` por `<app-timer>` |
| `bank-form.component.html` | Campos `tiempoLimitePregunta` expuestos en el formulario |

**Métricas:** 20 archivos · +363 / -73 líneas.

---

### PR #57 — `yandris-rivera/refactor-cache/-websockets`

**Refactorizó toda la infraestructura de cache y websockets (D2/R2).**

El gateway monolítico fue descompuesto: cada dominio tiene ahora sus propios handlers y servicios de cache.

| Antes | Después |
|---|---|
| `infrastructure/cache/use-cases/` con 5 use-cases de cache mezclados | Cache movido a cada módulo de dominio (`salas/cache/`, `votos/cache/`, `chat/cache/`, `comodines/cache/`) |
| `juego/websockets/` con use-cases y service monolíticos | Handlers separados por dominio: `salas/websockets/`, `votos/websockets/`, `comodines/websockets/`, `chat/websockets/` |
| `juego.gateway.ts` delegaba y acumulaba lógica | `juego.gateway.ts` ahora solo despacha a los handlers |
| `participants-cache`, `room-state-cache`, `votes-cache`, `chat-cache`, `consensus-cache` en un mismo módulo | Cada uno en su dominio correspondiente como `@Injectable()` service |

Se agregó `memory-cache.store.ts` como abstracción base compartida.

**Métricas:** 88 archivos · +1975 / -3889 líneas (net -1914 — reducción de código).

---

### PR #58 — `brydyan/feat-progreso-de-preguntas`

**Completó el componente de progreso y agregó CRUD de preguntas.**

| Archivo | Cambio |
|---|---|
| `question-progress.component.ts/html/scss` | Segmentos de color por estado: `activa` · `correcta` · `incorrecta` · `pendiente` (P1, P2) |
| `bank-form.component.html/scss/ts` | Inputs `feedbackCorrecto` / `feedbackIncorrecto` visibles en el formulario (F1) |
| `delete-question.use-case.ts` | Nuevo use-case para eliminar pregunta de un banco |
| `bancos.controller.ts` | Endpoint `DELETE /bancos/:id/preguntas/:questionId` |
| `bancos.service.ts` | Método `deleteQuestion()` |
| `reportes.service.ts` | Ajustes en `construirReporte` para nuevos campos de feedback |
| `juego.gateway.ts` | +12 líneas (ajustes menores de compatibilidad) |

**Métricas:** 18 archivos · +286 / -50 líneas.

---

### PR #59 — `brydyan/fix-respuesta-visual`

**Fixes visuales sobre el timer y la selección de respuesta.**

| Commit | Qué resolvió |
|---|---|
| `timer circular` | `TimerComponent` rediseñado como anillo SVG circular con `stroke-dashoffset` animado |
| `color de seleccionado` | Color de la opción seleccionada en `active-question` ahora es consistente con el design system |
| `timer freeze al responder` | El timer se congela visualmente al confirmar respuesta (evitaba confusión de seguir contando) |

**Métricas:** 6 archivos · +78 / -34 líneas.

---

### Impacto sobre el backlog

| Tarea | Estado tras estos PRs |
|---|---|
| T1–T9 Timer | ✅ Completo |
| P1–P2 Progreso | ✅ Completo |
| F1 Feedback en formulario | ✅ Completo |
| F2 Fallback texto vacío | ⬜ Pendiente |
| F3 Visibilidad host/admin | ⬜ Pendiente |
| D2 Refactor gateway | ✅ Completo |
| R2 Gateway LOC | ✅ Resuelto por D2 |
| B1–B4 Bugs | ⬜ Sin tocar |
| D1, D3, D4, D5 Deuda | ⬜ Pendientes |
| R1 Constructor complexity | ⬜ Pendiente |
| N1 Eliminar pregunta (nuevo) | ✅ Implementado PR #58 |

---

## 1. Correcciones

### B1 🔴 — Panel de comodines duplicado en el mismo template

**Archivo:** `frontend/src/app/features/room/components/active-question/active-question.component.html`

**Líneas afectadas:** 100–137 (clase `--inline`) y 186–223 (sin modificador)

El bloque completo de comodines aparece dos veces dentro del mismo template. Uno tiene
`observer-wildcards-panel--inline` y el otro no, pero el contenido es idéntico — mismos
`@for`, mismo binding de eventos, mismo texto vacío. Si se modifican los comodines, hay que
hacerlo en dos lugares y es muy fácil que diverjan.

**Corrección:** Extraer el bloque a un sub-componente `WildcardsPanel` o, si el problema es solo
de layout (inline vs bloque), manejar la variante con un `input()` boolean y un binding de clase,
manteniendo un único bloque en el template.

---

### B2 🔴 — `alert()` nativo en lugar de `ToastService`

**Archivo:** `frontend/src/app/features/room/components/active-question/active-question.component.ts:355`

```ts
// ANTES (mal)
alert('No se pudo obtener la sugerencia de la IA. Por favor, intenta más tarde.');

// DESPUÉS (correcto, consistente con el resto de la app)
this.toastService.show('No se pudo obtener la sugerencia de la IA', 'error', 'Comodín IA');
```

`alert()` bloquea el hilo principal, no sigue el design system y rompe la UX en mobile.

---

### B3 🟡 — Tipo `any[]` en el input `preguntas`

**Archivo:** `frontend/src/app/features/room/components/active-question/active-question.component.ts:50`

```ts
// ANTES
readonly preguntas = input<any[]>([]);

// DESPUÉS — usar el tipo ya definido en game-socket.service.ts o ampliar Pregunta
readonly preguntas = input<PreguntaHistorial[]>([]);
```

El tipo `Pregunta` de `game-socket.service.ts` no incluye `respuestaDada`, `feedbackCorrecto`,
`feedbackIncorrecto` ni `monto`, que son los campos que el componente usa implícitamente.
Hace falta definir `PreguntaHistorial` como extensión de `Pregunta` con esos campos tipados,
y eliminar los castings internos `(p: any)` y `(o: any)`.

---

### B4 🟢 — `console.log` / `console.error` en código de producción

**Archivos:** `active-question.component.ts`, `game-socket.service.ts`, `room.component.ts`

Hay docenas de mensajes de debug con prefijos `[COMODIN:IA]`, `[WS:ronda_reiniciada]`,
`[GameSocketService]`, etc. En producción generan ruido en la consola del usuario y pueden
filtrar información de estructura interna.

**Corrección:** Eliminarlos todos, o reemplazarlos por un servicio/flag de `isDevMode()` de Angular
que los suprima en build de producción.

---

## 2. Feature: Timer

> El timer **ya existe parcialmente** pero tiene tres problemas fundamentales que hay que resolver.

### Estado actual

| Capa | Estado |
|---|---|
| **Backend** | El gateway recibe `temporizador_actualizado` del host y hace broadcast. **No hay timer server-side.** |
| **Schema DB** | No existe campo `tiempoLimitePregunta` en `Salas` ni en `Rondas`. |
| **Frontend signal** | `tiempoRestante = signal<number \| null>(null)` existe en `GameSocketService`. |
| **UI** | Solo texto `⏱️ {{ t }}s` con clase CSS `--low` cuando `t <= 5`. Sin barra, sin animación. |
| **Entre preguntas** | No existe countdown de transición. La siguiente pregunta aparece inmediatamente. |

### Problema arquitectural — el host es el reloj

El flujo actual es:

```
Host (frontend) → emite temporizador_actualizado cada segundo (setInterval del frontend)
Backend          → solo hace server.to(room).emit(...)
```

Si el host tiene lag, todos los clientes tienen un timer desincronizado.
Si el host cierra la pestaña, el timer muere.
El tiempo puede ser manipulado desde las DevTools del host.

---

### 2.1 Backend — timer server-authoritative

**Paso 1: Agregar campo en el schema**

`backend/prisma/schema/models/juego/Salas.prisma`
```prisma
// Agregar en la sección Configuración
tiempoLimitePregunta Int @default(30) @map("tiempo_limite_pregunta") // segundos
```

Ejecutar `prisma migrate dev --name add_tiempo_limite_pregunta`.

**Paso 2: Exponer en el DTO y use-case de configuración**

Agregar `tiempoLimitePregunta: number` al DTO `UpdateConfiguracionSalaDto` y al use-case
`UpdateConfiguracionSalaUseCase`.

**Paso 3: Timer server-side en el Gateway**

`backend/src/infrastructure/websockets/juego.gateway.ts`

```ts
// Mapa de timers activos por sala (token → interval)
private readonly timersActivos = new Map<string, NodeJS.Timeout>();

private iniciarTimer(tokenCompartido: string, segundos: number): void {
  this.detenerTimer(tokenCompartido); // limpiar anterior si existe

  let restante = segundos;
  const interval = setInterval(() => {
    restante--;
    this.server.to(tokenCompartido).emit('temporizador_actualizado', restante);

    if (restante <= 0) {
      this.detenerTimer(tokenCompartido);
      this.server.to(tokenCompartido).emit('tiempo_agotado');
    }
  }, 1000);

  this.timersActivos.set(tokenCompartido, interval);
}

private detenerTimer(tokenCompartido: string): void {
  const t = this.timersActivos.get(tokenCompartido);
  if (t) {
    clearInterval(t);
    this.timersActivos.delete(tokenCompartido);
  }
}
```

- Llamar a `iniciarTimer()` cuando se recibe `pregunta_liberada`.
- Llamar a `detenerTimer()` en `pregunta_respondida` y `ronda_reiniciada`.
- Limpiar en `handleDisconnect` para no dejar timers huérfanos.

**Paso 4: Evento `transicion_pregunta` (countdown entre preguntas)**

Después de `tiempo_agotado` o de broadcast de `pregunta_respondida`, el backend puede emitir:

```ts
this.server.to(tokenCompartido).emit('transicion_pregunta', { segundos: 3 });
```

El frontend muestra un overlay de cuenta regresiva antes de que el host libere la siguiente.

---

### 2.2 Frontend — nuevo componente `TimerComponent`

**Crear:** `frontend/src/app/shared/ui/timer/timer.component.ts`

```ts
@Component({
  selector: 'app-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
  styleUrl: './timer.component.scss',
})
export class TimerComponent {
  readonly tiempoRestante = input.required<number | null>();
  readonly totalTiempo    = input<number>(30);
  readonly modo           = input<'pregunta' | 'transicion'>('pregunta');

  protected readonly porcentaje = computed(() => {
    const t = this.tiempoRestante();
    if (t === null) return 100;
    return Math.max(0, Math.round((t / this.totalTiempo()) * 100));
  });

  protected readonly urgente = computed(() => {
    const t = this.tiempoRestante();
    return t !== null && t <= Math.ceil(this.totalTiempo() * 0.2);
  });

  protected readonly advertencia = computed(() => {
    const t = this.tiempoRestante();
    return t !== null && t <= Math.ceil(this.totalTiempo() * 0.5) && !this.urgente();
  });
}
```

**Comportamiento visual:**

| Porcentaje restante | Color | Animación |
|---|---|---|
| > 50 % | Verde `#22c55e` | Ninguna |
| 20 – 50 % | Amarillo `#f59e0b` | Ninguna |
| < 20 % (o ≤ 5 s) | Rojo `#ef4444` | Pulso CSS (`@keyframes pulse`) |

**Elemento visual:** Barra de progreso lineal horizontal + número de segundos centrado.
Opción alternativa: anillo SVG circular (`stroke-dashoffset` animado).

**Modo `transicion`:** Muestra un texto "Próxima pregunta en..." con número grande centrado,
fondo overlay semitransparente sobre el contenido de la pregunta.

---

### 2.3 Integrar en `ActiveQuestionComponent`

- Reemplazar el bloque `@if (tiempoRestante(); as t)` del header por `<app-timer>`.
- Pasar `[totalTiempo]="tiempoLimiteSala"` desde el componente padre (`RoomComponent`).
- Escuchar el nuevo evento `tiempo_agotado` en `GameSocketService` y disparar feedback
  visual de "tiempo agotado" si el estudiante no había respondido.
- Escuchar `transicion_pregunta` y mostrar el overlay de transición.

---

## 3. Feature: Progreso de preguntas

### Estado actual

En el header de `active-question.component.html`:
```html
<span class="pagination-info"> {{ currentIndex() + 1 }} / {{ preguntas().length }} </span>
```

Solo fracción de texto. Sin color, sin indicación de correctas/incorrectas.

### Mejora propuesta

**3.1 — Barra de progreso lineal**

Agregar debajo o encima del header una barra que muestre el avance:

```ts
// En ActiveQuestionComponent
protected readonly porcentajeProgreso = computed(() => {
  const total = this.preguntas().length;
  if (!total) return 0;
  return Math.round(((this.currentIndex() + 1) / total) * 100);
});
```

```html
<div class="progress-track" role="progressbar"
     [attr.aria-valuenow]="porcentajeProgreso()"
     aria-valuemin="0" aria-valuemax="100">
  <div class="progress-fill" [style.width.%]="porcentajeProgreso()"></div>
</div>
```

**3.2 — Segmentos de color (opcional, mayor impacto visual)**

En lugar de una barra sólida, un `@for` sobre `preguntas()` que renderiza un segmento por
pregunta con color según su estado:

- Gris: pendiente
- Verde: respondida correctamente
- Rojo: respondida incorrectamente
- Naranja pulsante: activa ahora

Esto da una vista de mapa completo del progreso de la ronda de un vistazo.

---

## 4. Feature: Feedback de pregunta

### Estado actual (verificado en código)

| Elemento | Estado |
|---|---|
| Campos en BD | ✅ `feedbackCorrecto String?` y `feedbackIncorrecto String?` en `Preguntas.prisma` |
| Propagación WS | ✅ Pasados en `pregunta_liberada` y en `historialPreguntas` |
| Display en UI | ✅ Existe bloque `feedback-card` en el template con ✅/❌ y texto del feedback |
| Campos opcionales | ⚠️ `String?` — si no se llenan, la tarjeta muestra ✅/❌ pero sin texto explicativo |
| Visibilidad por rol | ⚠️ Solo visible cuando `showFeedback()` es verdadero — aplica igual para estudiante y observador |

**Conclusión:** el feedback **sí se muestra en pantalla**, tanto el ícono de correcto/incorrecto
como el texto de explicación. El único riesgo es que los campos son opcionales y si el admin
no los llena, la tarjeta queda vacía de texto.

### Gaps a cubrir

**G1 — Campos obligatorios sugeridos o placeholder en el formulario del banco**

Verificar que en `bank-detail` (página de edición de preguntas) los campos `feedbackCorrecto`
e `feedbackIncorrecto` sean visibles y tengan placeholder descriptivo. Si no aparecen,
agregarlos al formulario.

**G2 — Fallback cuando el feedback está vacío**

Si `feedbackCorrecto` y `feedbackIncorrecto` son `null`, la tarjeta muestra solo el ícono.
Agregar un texto de fallback genérico:

```ts
protected readonly feedbackData = computed(() => {
  // ... lógica existente ...
  return {
    esCorrecta: respuestaDada.esCorrecta,
    feedback: respuestaDada.esCorrecta
      ? (p.feedbackCorrecto || '¡Respuesta correcta!')      // fallback
      : (p.feedbackIncorrecto || 'La respuesta es incorrecta.'), // fallback
  };
});
```

**G3 — Visibilidad del feedback para el host/admin**

Confirmar que el admin vea el feedback de cada pregunta en su vista de control, no solo
el estudiante. Actualmente `showFeedback()` no distingue por rol.

---

## 5. Deuda técnica — complejidad alta

Funciones que superan los umbrales en el análisis estático y son candidatas a refactor
en cuanto haya tiempo:

| Función | Archivo | Cognitiva | Acción sugerida |
|---|---|---|---|
| `RoomComponent.constructor` | `room.component.ts:190` | 30 | Extraer lógica de init en métodos privados (`initSocket()`, `initSalaState()`, `initChatListener()`) |
| `GameSocketService.conectar` | `game-socket.service.ts:88` | 28 | Separar listeners por dominio: `_registerRondaHandlers()`, `_registerComodinHandlers()`, `_registerChatHandlers()` |
| `FileParserService.parseJson` | `file-parser.service.ts:109` | 28 | Dividir en parsers por tipo de formato con early returns |
| `GetSalaDetailsUseCase.execute` | `get-sala-details.use-case.ts:27` | 18 / 160 LOC | Extraer mapeo a funciones puras separadas |
| `ReportesService.construirReporte` | `reportes.service.ts:51` | 18 / nesting 5 | Aplanar los niveles de nesting con extracciones |

> **Nota:** `GameSocketService.conectar` (D2) fue resuelto en PR #57. La tabla refleja el estado previo a ese refactor; ver sección 0b para detalle.

---

## 6. Feature: Eliminar pregunta de banco

> Implementado en PR #58 · 2026-06-07

### Qué se hizo

Se agregó la capacidad de eliminar una pregunta individual de un banco sin borrar el banco completo.

| Archivo | Rol |
|---|---|
| `delete-question.use-case.ts` | Valida que la pregunta pertenezca al banco y ejecuta el delete en Prisma |
| `bancos.controller.ts` | Endpoint `DELETE /bancos/:id/preguntas/:questionId` |
| `bancos.service.ts` | Método `deleteQuestion(bancoId, questionId)` |
| `bancos.service.spec.ts` | Tests del nuevo método |
| `get-banco.use-case.ts` | Ajuste menor para consistencia tras el delete |
| `bank-form.component.ts/html` | Botón de eliminar pregunta en el formulario del banco |
| `bancos.service.ts` (frontend) | Método `deleteQuestion()` para llamar al endpoint |

### Pendiente de verificar

- Confirmar que el endpoint devuelve 404 cuando la pregunta no existe o no pertenece al banco.
- Verificar que al eliminar una pregunta usada en rondas activas no rompe el historial de respuestas.

---

> El listado de tareas accionables está en [`TAREAS.md`](./TAREAS.md).
