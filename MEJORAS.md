# Quizis — Backlog de mejoras y correcciones

> Generado el 2026-06-03 a partir de análisis estático con codegraph + revisión manual del código.
> Prioridades: 🔴 Alta · 🟡 Media · 🟢 Baja

---

## Índice

1. [Correcciones (bugs / code smells)](#1-correcciones)
2. [Feature: Timer server-authoritative + visual](#2-feature-timer)
3. [Feature: Barra de progreso de preguntas](#3-feature-progreso)
4. [Feature: Feedback de pregunta — estado actual y gaps](#4-feature-feedback)
5. [Deuda técnica — complejidad alta](#5-deuda-técnica)

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

---

> El listado de tareas accionables está en [`TAREAS.md`](./TAREAS.md).
