# Quizis — Listado de tareas

> 🔴 Alta · 🟡 Media · 🟢 Baja  
> Última revisión: 2026-06-08 — post merge PRs #56–#59

---

## Pendiente

### Correcciones

- [ ] 🔴 **B1** — Eliminar el panel de comodines duplicado en `active-question.component.html`
- [ ] 🔴 **B2** — Reemplazar `alert()` por `toastService.show()` en `active-question.component.ts:355`
- [ ] 🟡 **B3** — Tipar `preguntas = input<any[]>([])` con interfaz `PreguntaHistorial` correcta
- [ ] 🟢 **B4** — Eliminar `console.log` / `console.error` de producción (active-question, game-socket, room)

### Feedback de pregunta

- [ ] 🟡 **F2** — Agregar texto de fallback genérico cuando los campos de feedback están vacíos
- [ ] 🟢 **F3** — Confirmar que el host/admin también vea el feedback en su vista de control

### Feature: Eliminar pregunta

- [ ] 🟡 **N2** — Verificar comportamiento cuando la pregunta fue usada en rondas activas (posible integridad referencial)

### Deuda técnica

- [ ] 🟢 **D1** — Refactorizar `RoomComponent.constructor` (cognitive 30) — extraer en métodos privados
- [ ] 🟢 **D3** — Refactorizar `FileParserService.parseJson` (cognitive 28) — dividir por tipo de formato
- [ ] 🟢 **D4** — Refactorizar `GetSalaDetailsUseCase.execute` (160 LOC) — extraer mapeos a funciones puras
- [ ] 🟢 **D5** — Refactorizar `ReportesService.construirReporte` (nesting 5) — aplanar niveles de anidación

### Regresiones

- [ ] 🟡 **R1** — `ActiveQuestionComponent.constructor` subió de cognitive 22 → **24** — extraer el `effect()` de consenso en método privado

---

## Hecho

### Feature: Timer — PR #56 + #59 (2026-06-07)

- [x] 🔴 **T1** — Campo `tiempoLimitePregunta Int @default(30)` en `Salas.prisma` + migración
- [x] 🔴 **T2** — Exponer `tiempoLimitePregunta` en el DTO y use-case de configuración de sala
- [x] 🔴 **T3** — Timer server-authoritative en el Gateway (reemplaza el relay del frontend)
- [x] 🔴 **T4** — Evento `tiempo_agotado` emitido desde backend cuando el contador llega a 0
- [x] 🔴 **T5** — Evento `transicion_pregunta` con countdown de 3 s entre preguntas (backend)
- [x] 🔴 **T6** — `TimerComponent` creado con anillo SVG circular y estados de color (refinado en PR #59)
- [x] 🔴 **T7** — Reemplazado `⏱️ {{ t }}s` por `<app-timer>` en `active-question.component.html`
- [x] 🟡 **T8** — `GameSocketService` escucha `tiempo_agotado` y muestra feedback visual
- [x] 🟡 **T9** — `GameSocketService` escucha `transicion_pregunta` y muestra overlay de cuenta regresiva

### Feature: Progreso de preguntas — PR #56 + #58 (2026-06-07)

- [x] 🟡 **P1** — Barra de progreso con segmentos en el header de `active-question`
- [x] 🟢 **P2** — Segmentos de color por estado (pendiente / correcta / incorrecta / activa)

### Feature: Feedback de pregunta — PR #58 (2026-06-07)

- [x] 🟡 **F1** — Formulario del banco tiene inputs para `feedbackCorrecto` e `feedbackIncorrecto`

### Feature: Eliminar pregunta — PR #58 (2026-06-07)

- [x] 🟡 **N1** — Endpoint `DELETE /bancos/:id/preguntas/:questionId` + use-case + botón en bank-form

### Deuda técnica — PR #57 (2026-06-07)

- [x] 🟡 **D2** — `GameSocketService.conectar` separado en handlers por dominio (refactor cache + gateway)

### Regresiones PR #54 — resueltas en PR #57

- [x] 🟡 **R2** — `GameSocketService.conectar` 179 → 207 LOC — resuelto por el refactor D2
