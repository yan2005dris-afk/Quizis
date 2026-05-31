# Detalle de cambios por archivo

## Resumen

Se implementó el sistema de **validación por consenso de equipo**: todos los estudiantes activos deben confirmar su respuesta y la mayoría (>50%) debe elegir la misma opción para que se procese. Además se corrigieron warnings de lint pre-existentes en varios archivos.

---

## Archivos nuevos

---

### `backend/src/infrastructure/cache/use-cases/consensus-cache.use-case.ts`

**Por qué existe:** El sistema necesitaba un lugar donde guardar temporalmente los votos individuales de cada estudiante durante una pregunta activa, y saber qué estudiantes deben votar antes de evaluar. No podía reutilizar la tabla de la base de datos porque las operaciones deben ser instantáneas (el timer corre).

**Qué hace:** Administra dos estructuras en Redis por cada pregunta activa:
- `consensus:{token}:{preguntaId}:votes` → `HASH` que mapea `nickname → opcionId` (quién eligió qué)
- `consensus:{token}:{preguntaId}:required` → `SET` con los nicknames de estudiantes que deben votar

Expone 7 métodos:

| Método | Operación Redis | Para qué se usa |
|--------|----------------|-----------------|
| `initializeRequired` | `DEL` + `SADD` + `EXPIRE` | Al liberar una pregunta, carga los estudiantes activos |
| `recordVote` | `HSET` + `EXPIRE` | Cuando un estudiante confirma su respuesta |
| `getVotes` | `HGETALL` | Para saber cuántos y quiénes votaron |
| `getRequired` | `SMEMBERS` | Para saber a quién se espera |
| `removeFromRequired` | `SREM` | Cuando un estudiante se desconecta sin haber votado |
| `addToRequired` | `SADD` | Cuando un estudiante se reconecta con pregunta activa |
| `clearConsensus` | `DEL` (ambas claves) | Después de un re-voto para limpiar y empezar de nuevo |

Incluye fallback a `Map`/`Set` en memoria si Redis no está disponible, siguiendo el patrón de los demás use cases de caché del proyecto. TTL de 3600 segundos en todas las claves.

---

### `backend/src/juego/websockets/use-cases/evaluate-consensus.use-case.ts`

**Por qué existe:** Centraliza la lógica de decisión del consenso en un lugar reutilizable. La necesitan `SubmitAnswerUseCase`, `HandleDisconnectUseCase` y `JoinRoomUseCase` — si estuviera duplicada en cada uno sería un problema de mantenimiento.

**Qué hace:** Lee los votos y los requeridos de `ConsensusCacheUseCase` y retorna un resultado tipado:

```typescript
type ConsensusResult =
  | { type: 'pending'; votosRecibidos: number; totalRequeridos: number }
  | { type: 'majority'; winningOpcionId: number; votosRecibidos: number; totalRequeridos: number }
  | { type: 'no-majority'; votosRecibidos: number; totalRequeridos: number }
  | { type: 'single'; winningOpcionId: number }
```

**Lógica de evaluación:**
1. Si `required.size === 1` → `single` (un solo estudiante, pasa directo)
2. Si algún requerido no ha votado → `pending`
3. Si todos votaron → contar votos por opción → si alguna supera el 50% → `majority`
4. Si ninguna supera el 50% → `no-majority`

El umbral es **estrictamente mayor a 50%**: un empate 2-2 con 4 estudiantes no es mayoría.

---

## Archivos modificados — lógica de negocio

---

### `backend/src/juego/websockets/use-cases/submit-answer.use-case.ts`

**Por qué cambió:** Era el punto de entrada principal para respuestas. Antes finalizaba la pregunta directamente en el momento en que un estudiante confirmaba. Ahora debe registrar el voto individual y esperar a que todos confirmen.

**Qué cambió:**

- Se agregó `nickname: string` al tipo `AnswerPayload` para identificar quién vota
- Se inyectaron `ConsensusCacheUseCase` y `EvaluateConsensusUseCase`
- El tipo de retorno cambió de un objeto plano a `SubmitAnswerResult` (unión discriminada con `status`)
- **Flujo nuevo:**
  1. Validaciones existentes se mantienen (pregunta activa, no respondida, opción válida)
  2. `consensusCache.recordVote(token, preguntaId, nickname, opcionId)`
  3. `evaluateConsensus.execute(token, preguntaId)`
  4. Switch en el resultado:
     - `pending` → retorna sin persistir (se espera más votos)
     - `majority` / `single` → llama a `RecordAnswerUseCase` con `winningOpcionId`, marca `status = 'answered'`, retorna resultado
     - `no-majority` → llama a `consensusCache.clearConsensus()`, retorna sin persistir

---

### `backend/src/juego/websockets/use-cases/handle-disconnect.use-case.ts`

**Por qué cambió:** Cuando un estudiante se desconecta durante una votación activa, el sistema debe recalcular quién debe votar. Si el estudiante que se fue no había votado, ya no se le puede esperar.

**Qué cambió:**

- Se inyectaron `RoomStateCacheUseCase`, `ConsensusCacheUseCase`, `EvaluateConsensusUseCase`
- El tipo de retorno incluye ahora `consensusResult?: ConsensusResult`
- **Lógica nueva** (después de remover al participante de online):
  1. Verifica si hay pregunta activa con `status = 'released'`
  2. Revisa si el estudiante desconectado ya había votado (`votes.has(nickname)`)
  3. Si **no había votado** → `removeFromRequired()` (ya no se le espera)
  4. Si **ya había votado** → no toca nada (su voto se mantiene)
  5. Llama a `evaluateConsensus.execute()` y devuelve el resultado para que el gateway lo emita

---

### `backend/src/juego/websockets/use-cases/join-room.use-case.ts`

**Por qué cambió:** Cuando un estudiante se reconecta mientras la pregunta sigue activa, el equipo debe esperarlo de nuevo (si el timer no expiró).

**Qué cambió:**

- Se inyectaron `RoomStateCacheUseCase`, `ConsensusCacheUseCase`, `EvaluateConsensusUseCase`
- El payload recibe `rol?: string` para saber si es estudiante u observador
- El tipo de retorno incluye `consensusResult?: ConsensusResult`
- **Lógica nueva** (después del join normal):
  1. Verifica pregunta activa con `status = 'released'` y `rol === 'estudiante'`
  2. `addToRequired()` — el estudiante vuelve al grupo que debe votar
  3. `evaluateConsensus.execute()` — por si ya había votado antes de desconectarse

---

### `backend/src/infrastructure/websockets/juego.gateway.ts`

**Por qué cambió:** El gateway es el orquestador de todos los eventos WebSocket. Necesitaba cuatro cambios para conectar la nueva lógica de consenso con los clientes.

**Qué cambió:**

**1. Inyección de nuevos use cases**
Se inyectaron `ConsensusCacheUseCase` y `EvaluateConsensusUseCase` en el constructor.

**2. `handlePreguntaLiberada` — inicialización del SET de requeridos**
Cuando se libera una pregunta, el gateway ahora obtiene los estudiantes activos (`getOnlineParticipants` + `getParticipantsWithRoles`) y llama a `consensusCache.initializeRequired()`. Esto define quiénes deben votar antes de que se evalúe el consenso.

**3. `handleAnswer` — switch en ConsensusResult**
Antes emitía `pregunta_respondida` directamente. Ahora:
- Resuelve el `nickname` del estudiante desde `socketMap` (el mapa interno del gateway) en vez de confiar en el payload — evita suplantación
- Llama a `submitAnswer` con el nickname incluido
- Hace switch en `result.status`:
  - `pending` → emite `voto_confirmado { preguntaId, votosRecibidos, totalRequeridos }`
  - `majority` / `single` → emite `pregunta_respondida` (igual que antes)
  - `no-majority` → emite `revoto_solicitado { preguntaId, motivo: 'sin_mayoria' }` y reinicializa el SET de requeridos con los activos actuales

**4. `handleDisconnect` y `handleJoinRoom` — emisión del resultado de consenso**
Ambos usan el nuevo helper privado `emitConsensusResult(token, preguntaId, result)` que centraliza el switch de eventos. Se eliminó un bloque duplicado que existía en `handleDisconnect` y que removía al estudiante del SET incondicionalmente (sin importar si había votado), corrigiendo un bug crítico.

---

## Archivos modificados — registro de módulos

---

### `backend/src/juego/websockets/websockets.module.ts`

**Por qué cambió:** NestJS necesita que los providers estén registrados en el módulo para poder inyectarlos. Se agregó `EvaluateConsensusUseCase` a `providers`. `ConsensusCacheUseCase` ya estaba disponible desde `CacheModule`.

### `backend/src/infrastructure/cache/cache.module.ts`

**Por qué cambió:** Se agregó `ConsensusCacheUseCase` a `providers` y `exports` para que esté disponible en los módulos que importan `CacheModule`.

---

## Archivos modificados — schema de base de datos

### `backend/prisma/schema/models/juego/RespuestasRonda.prisma`

**Por qué cambió:** La respuesta final que se persiste en la base de datos ahora puede asociarse al estudiante cuya opción "ganó" el consenso.

**Qué cambió:** Se agregó `participanteId Int? @map("participante_id")` (nullable) y la relación con `Participantes`. Es opcional para no romper datos históricos ni la lógica de salas con un solo estudiante.

> **Pendiente:** `npx prisma migrate dev --name add_participante_id_to_respuestas_ronda`

---

## Archivos modificados — frontend

---

### `frontend/src/app/core/services/game-socket.service.ts`

**Por qué cambió:** El servicio es la fuente de verdad del estado del juego en el frontend. Los componentes necesitan saber cuántos compañeros confirmaron y cuándo hay que votar de nuevo.

**Qué cambió:**

4 nuevas señales reactivas:
- `votantesConfirmados` → cuántos ya confirmaron en la ronda actual
- `totalVotantesRequeridos` → cuántos deben confirmar
- `esperandoConsenso` → `true` mientras se espera al resto del equipo
- `revotoSolicitado` → `true` cuando el servidor pidió re-voto

2 nuevos listeners:
- `voto_confirmado` → actualiza los contadores y activa `esperandoConsenso`
- `revoto_solicitado` → activa `revotoSolicitado`, resetea contadores

El listener de `pregunta_respondida` existente se extendió para limpiar todas las señales de consenso al finalizar la pregunta.

Nuevo método `resetRevoto()` llamado por el componente después de procesar el re-voto.

---

### `frontend/src/app/features/room/components/active-question/active-question.component.ts`

**Por qué cambió:** La señal `respuestaConfirmada` era de solo ida (`false → true`). Para el re-voto necesita poder volver a `false` junto con la opción seleccionada.

**Qué cambió:** Se agregó un `effect()` en el constructor que observa `gameSocket.revotoSolicitado`. Cuando se activa:
1. Resetea `respuestaConfirmada` a `false`
2. Resetea `localSelectedId` a `null`
3. Llama a `gameSocket.resetRevoto()` para apagar la señal

Esto hace que el componente vuelva automáticamente al estado "eligiendo opción" sin necesidad de recargar.

---

### `frontend/src/app/features/room/components/active-question/active-question.component.html`

**Por qué cambió:** Necesitaba mostrar retroalimentación visual al estudiante después de confirmar mientras espera a sus compañeros.

**Qué cambió:** Se agregó un bloque condicional que aparece cuando `respuestaConfirmada()` es `true` y `gameSocket.esperandoConsenso()` es `true`:

```
Esperando a compañeros...   1 / 3
```

Usa clases CSS ya existentes en el componente — no se agregaron estilos nuevos.

---

## Archivos modificados — tests

---

### `backend/src/infrastructure/websockets/juego.gateway.spec.ts`

**Por qué cambió:** El spec existente creaba `JuegoGateway` en el módulo de testing sin incluir las nuevas dependencias (`ConsensusCacheUseCase`, `EvaluateConsensusUseCase`). NestJS lanza error en tiempo de compilación del módulo si faltan providers.

**Qué cambió:** Se importaron y agregaron ambos use cases como mocks vacíos `{ useValue: {} }` al array de `providers`. Los tests originales no prueban la lógica de consenso (prueban `handleComodinBloqueado`) — solo necesitaban que el módulo compilara.

---

### `backend/src/juego/websockets/use-cases/submit-answer.use-case.spec.ts`

**Por qué cambió:** La firma de `execute()` cambió completamente — nuevo `nickname` en el payload, dos nuevas dependencias inyectadas, y el tipo de retorno es ahora una unión discriminada.

**Qué cambió:** Se actualizaron los mocks para incluir `ConsensusCacheUseCase` y `EvaluateConsensusUseCase`. Se agregaron casos de prueba para todos los nuevos branches: `pending`, `majority`, `single`, `no-majority`, y el caso de voto-post-expiración que debe lanzar `BadRequestException`.

---

### `backend/src/juego/websockets/use-cases/handle-disconnect.use-case.spec.ts`

**Por qué cambió:** El use case ganó tres dependencias nuevas y lógica condicional basada en si el estudiante había votado o no. Los tests originales no cubrían ese comportamiento.

**Qué cambió:** Se reescribió el spec completo con todos los providers nuevos. Se agregaron 4 escenarios: desconexión sin votar, desconexión después de votar, desconexión sin pregunta activa, y desconexión de no-estudiante.

---

### `backend/src/juego/websockets/use-cases/join-room.use-case.spec.ts`

**Por qué cambió:** Igual que el anterior — nuevas dependencias y lógica de reconexión que no tenían cobertura.

**Qué cambió:** Se reescribió con todos los providers. Se agregaron 4 escenarios: reconexión como estudiante con pregunta activa, reconexión como observador (sin consenso), unión sin pregunta activa, y pregunta ya respondida.

---

## Archivos modificados — corrección de warnings de lint pre-existentes

Estos archivos **no tenían relación con el consenso**. Tenían warnings de `@typescript-eslint/no-unused-vars` que existían antes del cambio.

| Archivo | Qué se corrigió |
|---------|-----------------|
| `comodines.service.spec.ts` | Eliminadas variables `prisma` y `eventEmitter` declaradas pero nunca usadas en tests |
| `list-all-salas.use-case.spec.ts` | Eliminada variable `prisma` declarada pero nunca usada en tests |
| `reactivate-room.use-case.ts` | Eliminado import de `RegenerateRoomTokenUseCase` que no se usaba en el archivo |
| `validate-token-sala.use-case.ts` | Eliminado import de `EstadoSala` que no se usaba en el archivo |
| `game-socket.service.ts` (línea 179) | Renombrado parámetro `data` a `_data` en el listener de `partida_finalizada` (el cuerpo no usaba el parámetro) |
| `game-over.component.spec.ts` | Eliminados import de `signal` y variable `component` declarados pero nunca usados |
| `create-sala.component.ts` | Eliminado `ButtonComponent` del import (solo se usaba `AlertComponent`) |

---

## Tests agregados (archivos nuevos de spec)

| Archivo | Tests | Qué cubren |
|---------|-------|-----------|
| `consensus-cache.use-case.spec.ts` | 17 | Todos los métodos en path Redis y en fallback memoria |
| `evaluate-consensus.use-case.spec.ts` | 9 | Los 4 tipos de resultado + caso borde 50% (no es mayoría) |

---

## Nuevos eventos WebSocket

| Evento | Quién lo emite | Payload | Cuándo |
|--------|---------------|---------|--------|
| `voto_confirmado` | Server | `{ preguntaId, votosRecibidos, totalRequeridos }` | Después de cada voto mientras se espera al resto |
| `revoto_solicitado` | Server | `{ preguntaId, motivo: 'sin_mayoria' }` | Cuando todos votaron pero no hay mayoría |
| `pregunta_respondida` | Server | `{ preguntaId, opcionId, esCorrecta, feedback }` | Solo cuando hay mayoría o 1 estudiante (igual que antes) |
