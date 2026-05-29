# Validación por Consenso de Equipo

## Qué se implementó

Sistema de votación grupal donde **todos los estudiantes activos deben confirmar su respuesta** antes de que se evalúe el resultado del equipo. La respuesta del equipo se determina por mayoría simple (más del 50%).

---

## Reglas del sistema

| Situación | Comportamiento |
|-----------|---------------|
| Todos confirman, hay mayoría (>50%) | Se procesa la respuesta ganadora |
| Todos confirman, no hay mayoría | Se emite `revoto_solicitado` — nueva ronda de votación |
| Un estudiante se desconecta **antes** de votar | Se excluye del conteo requerido, se re-evalúa |
| Un estudiante se desconecta **después** de votar | Su voto se mantiene |
| Un estudiante se reconecta con el timer activo | Se re-agrega al conteo requerido, los demás lo esperan |
| Solo hay un estudiante en la sala | Pasa directo sin esperar consenso (backward compatible) |
| El timer expira | Se evalúa con los votos recibidos hasta ese momento |

---

## Flujo completo

```
Pregunta liberada
    └─► Gateway inicializa SET de requeridos con estudiantes activos

Estudiante vota
    └─► recordVote en Redis (HASH)
    └─► evaluateConsensus
          ├─ pending     → emite voto_confirmado { votosRecibidos, totalRequeridos }
          ├─ majority    → emite pregunta_respondida (respuesta del equipo)
          ├─ single      → emite pregunta_respondida (bypass, 1 estudiante)
          └─ no-majority → emite revoto_solicitado
                               └─► reinicializa SET de requeridos con activos actuales

Estudiante se desconecta
    └─► si NO había votado: removeFromRequired → re-evalúa
    └─► si YA había votado: su voto se mantiene → re-evalúa

Estudiante se reconecta (timer activo)
    └─► addToRequired → re-evalúa (por si ya había votado antes de desconectarse)
```

---

## Nuevos eventos WebSocket

| Evento | Dirección | Payload | Cuándo se emite |
|--------|-----------|---------|-----------------|
| `voto_confirmado` | server → client | `{ preguntaId, votosRecibidos, totalRequeridos }` | Después de cada voto mientras se espera al resto |
| `revoto_solicitado` | server → client | `{ preguntaId, motivo: 'sin_mayoria' }` | Cuando todos votaron pero no hay mayoría |
| `pregunta_respondida` | server → client | `{ preguntaId, opcionId, esCorrecta, feedback }` | Cuando hay mayoría o solo hay 1 estudiante |

---

## Archivos nuevos

| Archivo | Qué hace |
|---------|----------|
| `backend/src/infrastructure/cache/use-cases/consensus-cache.use-case.ts` | Maneja las claves Redis del consenso: `HASH` de votos y `SET` de requeridos por pregunta |
| `backend/src/juego/websockets/use-cases/evaluate-consensus.use-case.ts` | Lógica pura de evaluación: lee votos y requeridos, retorna `pending / majority / no-majority / single` |

---

## Archivos modificados

### Backend

**`juego.gateway.ts`**
- `handlePreguntaLiberada`: inicializa el SET de requeridos con los estudiantes online al liberar la pregunta
- `handleAnswer`: resuelve el nickname desde `socketMap`, hace switch en `ConsensusResult` para emitir el evento correcto
- `handleDisconnect`: delega la lógica de consenso al use case, emite resultado si corresponde
- `handleJoinRoom`: al reconectar, re-agrega al SET y re-evalúa
- Nuevo helper privado `emitConsensusResult(token, preguntaId, result)`

**`submit-answer.use-case.ts`**
- Agrega `nickname` al payload
- En vez de finalizar directamente, registra el voto individual y llama a `EvaluateConsensusUseCase`
- Retorna `SubmitAnswerResult` con status: `pending | majority | single | no-majority`

**`handle-disconnect.use-case.ts`**
- Detecta si el estudiante que se desconectó había votado o no
- Solo llama `removeFromRequired` si **no** había votado
- Llama a `evaluateConsensus` y retorna el resultado en `consensusResult`

**`join-room.use-case.ts`**
- Al reconectar como estudiante con pregunta activa: llama `addToRequired` y `evaluateConsensus`
- Retorna `consensusResult` si corresponde

**`websockets.module.ts`**
- Registra `EvaluateConsensusUseCase` en providers

**`cache.module.ts`**
- Registra y exporta `ConsensusCacheUseCase`

**`RespuestasRonda.prisma`**
- Agrega `participanteId Int?` (nullable) con relación a `Participantes`

### Frontend

**`game-socket.service.ts`**
- Nuevas señales: `votantesConfirmados`, `totalVotantesRequeridos`, `esperandoConsenso`, `revotoSolicitado`
- Listeners para `voto_confirmado` y `revoto_solicitado`
- Método `resetRevoto()`

**`active-question.component.ts`**
- `effect()` que escucha `revotoSolicitado` → resetea `respuestaConfirmada` y `localSelectedId`

**`active-question.component.html`**
- Bloque condicional "Esperando a compañeros... X / Y" visible después de confirmar

---

## Claves Redis utilizadas

```
consensus:{tokenCompartido}:{preguntaId}:votes     → HASH: nickname → opcionId
consensus:{tokenCompartido}:{preguntaId}:required  → SET: nicknames de estudiantes requeridos
TTL: 3600 segundos
```

---

## Tests agregados

| Archivo | Tests |
|---------|-------|
| `consensus-cache.use-case.spec.ts` (nuevo) | 17 |
| `evaluate-consensus.use-case.spec.ts` (nuevo) | 9 |
| `submit-answer.use-case.spec.ts` (actualizado) | 19 |
| `handle-disconnect.use-case.spec.ts` (reescrito) | 7 |
| `join-room.use-case.spec.ts` (reescrito) | 8 |
| **Total** | **59** |

---

## Pending antes de deploy

```bash
cd backend
npx prisma migrate dev --name add_participante_id_to_respuestas_ronda
```

---

## Limitaciones conocidas

- **Timer server-side:** el timer es client-driven (pre-existente). Si el frontend falla en señalizar el fin del tiempo, la pregunta queda en estado `released` indefinidamente con consenso sin resolver.
- **`esCorrecta` en desconexión:** si una mayoría se alcanza por desconexión de estudiantes (caso raro), `pregunta_respondida` emite `esCorrecta: null` porque el path de `RecordAnswerUseCase` no fue ejecutado.
