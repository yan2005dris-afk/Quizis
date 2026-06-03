# Quizis — Listado de tareas

> 🔴 Alta · 🟡 Media · 🟢 Baja

---

## Correcciones

- [ ] 🔴 **B1** — Eliminar el panel de comodines duplicado en `active-question.component.html`
- [ ] 🔴 **B2** — Reemplazar `alert()` por `toastService.show()` en `active-question.component.ts:355`
- [ ] 🟡 **B3** — Tipar `preguntas = input<any[]>([])` con interfaz `PreguntaHistorial` correcta
- [ ] 🟢 **B4** — Eliminar `console.log` / `console.error` de producción (activo-question, game-socket, room)

---

## Feature: Timer

- [ ] 🔴 **T1** — Agregar campo `tiempoLimitePregunta Int @default(30)` en `Salas.prisma` + migración
- [ ] 🔴 **T2** — Exponer `tiempoLimitePregunta` en el DTO y use-case de configuración de sala
- [ ] 🔴 **T3** — Implementar timer server-authoritative en el Gateway (reemplazar el relay actual)
- [ ] 🔴 **T4** — Emitir evento `tiempo_agotado` cuando el contador llega a 0 (backend)
- [ ] 🔴 **T5** — Emitir evento `transicion_pregunta` con countdown entre preguntas (backend)
- [ ] 🔴 **T6** — Crear componente `TimerComponent` con barra de progreso y estados de color
- [ ] 🔴 **T7** — Reemplazar el texto `⏱️ {{ t }}s` por `<app-timer>` en `active-question.component.html`
- [ ] 🟡 **T8** — Escuchar `tiempo_agotado` en `GameSocketService` y mostrar feedback visual
- [ ] 🟡 **T9** — Escuchar `transicion_pregunta` y mostrar overlay de cuenta regresiva

---

## Feature: Progreso de preguntas

- [ ] 🟡 **P1** — Agregar barra de progreso lineal en el header de `active-question`
- [ ] 🟢 **P2** — Implementar segmentos de color por estado (pendiente / correcta / incorrecta / activa)

---

## Feature: Feedback de pregunta

- [ ] 🟡 **F1** — Verificar que el formulario de edición del banco tenga inputs para `feedbackCorrecto` e `feedbackIncorrecto`
- [ ] 🟡 **F2** — Agregar texto de fallback genérico cuando los campos de feedback están vacíos
- [ ] 🟢 **F3** — Confirmar que el host/admin también vea el feedback en su vista de control

---

## Deuda técnica

- [ ] 🟢 **D1** — Refactorizar `RoomComponent.constructor` (cognitive 30) — extraer en métodos privados
- [ ] 🟢 **D2** — Refactorizar `GameSocketService.conectar` (179 LOC) — separar listeners por dominio
- [ ] 🟢 **D3** — Refactorizar `FileParserService.parseJson` (cognitive 28) — dividir por tipo de formato
- [ ] 🟢 **D4** — Refactorizar `GetSalaDetailsUseCase.execute` (160 LOC) — extraer mapeos a funciones puras
- [ ] 🟢 **D5** — Refactorizar `ReportesService.construirReporte` (nesting 5) — aplanar niveles de anidación
