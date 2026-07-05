# Observer-Pattern Cleanup — PR Plan

Handoff plan for the implementing agent. Goal: finish aligning the codebase with the
intended architecture — REST carries commands, use-cases emit domain events, the WS
gateway (and other listeners) are OBSERVERS that translate events into socket pushes.
WebSocket stays transport-only (connection lifecycle + chat), never business logic.

The architecture is ALREADY ~80% there. This is cleanup, not a rewrite. Do NOT
restructure working flows; only close the gaps below.

## Where the codebase already is (do not touch)

- Single WS inbound handler: `@SubscribeMessage('unirse_sala')` — legitimate (presence
  / socket↔participant mapping). Keep it.
- The gateway has 8 `@OnEvent` observers translating domain events → socket broadcasts.
- `consensus.listener.ts` is a second, decoupled observer — this is the CANONICAL shape
  to mirror (a class with `@OnEvent` handlers that react and may re-emit).
- Use-cases emit via `eventEmitter.emit(GameEvents.X, payload)`.

## Canonical patterns (copy these, do not invent)

- Broadcaster method: `broadcastToRoom(tokenCompartido, event, data)`
  (`room-broadcaster.service.ts:21`). ONLY the gateway/listeners should call it.
- Emit from use-case: `this.eventEmitter.emit(GameEvents.X, payload)`.
- Observe + broadcast in gateway: `@OnEvent(GameEvents.X)` →
  `this.roomBroadcaster.broadcastToRoom(token, 'socket_event_name', payload)`.
- Decoupled non-gateway observer: `consensus.listener.ts` (`ConsensusListener`).

> ⚠️ GLOBAL INVARIANT: the SOCKET event names sent to clients
> (`comodin_bloqueado`, `voto_recibido`, `participantes`, etc.) MUST stay identical.
> Only the internal path changes (controller/service → emit → gateway @OnEvent →
> broadcast). The frontend contract does not change. Verify each socket event name is
> byte-for-byte the same after the refactor.

## Execution order

| Order | PR | Effort | Depends on |
|-------|----|--------|-----------|
| 1 | **I** | 30min | — (do first: clean event registry) |
| 2 | **G** | 2h | PR I, PR C (auth tests as safety net) |
| 3 | **H** | 1.5h | PR C, PR G (riskiest: file moves + imports) |
| 4 | **J** | (optional, scope later) | PR C |

Land PR C (the auth E2E from PLAN-N2-REALTIME.md) BEFORE G/H — these refactors need a
safety net.

---

# PR I — Consolidate the event registry

**Effort:** 30min · **Goal:** single source of truth for domain event names. Two events
use raw strings instead of the `GameEvents` registry.

**File:** `backend/src/core/common/events/game-events.types.ts`

Raw-string offenders (found via grep):
- `'sala.iniciada'` — emitted in `update-estado-sala.use-case.ts`, observed in
  `juego.gateway.ts` (`@OnEvent('sala.iniciada')`).
- `'comodin.ia.suggestion'` — emitted in `comodines.service.ts`, observed in
  `juego.gateway.ts` (`@OnEvent('comodin.ia.suggestion')`).

Steps:
1. Add to `GameEvents`:
   - `SALA.INICIADA: 'sala.iniciada'`
   - a new group `COMODINES: { IA_SUGGESTION: 'comodin.ia.suggestion' }`
2. Define proper payload interfaces for `SALA.INICIADA` (e.g. `SalaIniciadaEvent`) and `COMODINES.IA_SUGGESTION` (e.g. `IaSuggestionEvent`) to avoid `any` in `@OnEvent` handles.
3. Replace the raw strings at every emit site and every `@OnEvent` with the constants.
4. Keep the string VALUES identical (they are the actual event bus keys) — only the
   reference changes from a literal to `GameEvents.X`.

**Acceptance:** no raw-string event names remain (`rg "@OnEvent\('" src` and
`rg "emit\('[a-z]" src` return only socket-level `client.emit`/`broadcastToRoom`
literals, no domain-event literals).

---

# PR G — Route direct broadcasts through the event bus

**Effort:** 2.5h · **Depends on:** PR I · **Goal:** eliminate the three places that call
`broadcastToRoom` directly, bypassing the observer bus. This is the core of "pure
observer."

## G1. comodines-rest.controller.ts (worst — a controller broadcasting)

**File:** `backend/src/juego/comodines/interfaces/controllers/comodines-rest.controller.ts`

Today the CONTROLLER injects `RoomBroadcasterService` (line 40) and broadcasts directly:
- line 100: `broadcastToRoom(token, 'comodin_bloqueado', {...})`
- line 107: `broadcastToRoom(token, 'voto_recibido', {...})`

A controller must never touch the socket or emit events directly. Steps:
1. Create a clean `BlockComodinUseCase` under `comodines/application/use-cases/`.
2. The controller `bloquear` endpoint should call `BlockComodinUseCase.execute()`.
3. Inside `BlockComodinUseCase`, perform the database/cache mutation (`salasService.addBlockedComodin`) and then emit a domain event (e.g. `GameEvents.COMODINES.BLOQUEADO: 'comodines.bloqueado'`).
4. In `GameEvents`, define the payload interface for `ComodinBloqueadoEvent` containing `{ tokenCompartido, userId, tipo }`.
5. Add an `@OnEvent(GameEvents.COMODINES.BLOQUEADO)` listener in `juego.gateway.ts` that broadcasts the socket event `comodin_bloqueado` with the payload and, if `tipo === 'PUBLICO'`, also broadcasts `voto_recibido` with the reset values.
6. Remove `RoomBroadcasterService` from the controller constructor; the controller now only calls the use-case and returns the HTTP response.

## G2. salas.service.ts

**File:** `backend/src/juego/salas/application/salas.service.ts`

- line 51: injects `RoomBroadcasterService`
- line 186: `broadcastToRoom(token, 'participantes', list)`

Steps:
1. Add `GameEvents.SALA.PARTICIPANTES_ACTUALIZADOS: 'sala.participantes_actualizados'`.
2. Replace the direct broadcast with `this.eventEmitter.emit(...)` carrying `{ token, list }`.
3. Add `@OnEvent(GameEvents.SALA.PARTICIPANTES_ACTUALIZADOS)` in the gateway that
   broadcasts `'participantes'` (same socket name) with `list`.
4. Remove `RoomBroadcasterService` from `salas.service.ts` if no longer used.

> Bonus: this is likely the missing piece for the "role change doesn't refresh live"
> bug — once role-change use-cases emit `PARTICIPANTES_ACTUALIZADOS` (or call the path
> that does), the participant list propagates over sockets. Verify and wire.

## G3. chat/send-message.websocket.ts (Route through the Event Bus)

**File:** `backend/src/juego/chat/infrastructure/websockets/send-message.websocket.ts`

Broadcasts `mensaje_chat` directly. We route chat messages through the internal event bus for architectural consistency. 
- The chat still uses the WS transport, but internally goes through `emit -> listener -> broadcast`.
- Action: Emit `GameEvents.CHAT.MENSAJE_ENVIADO` from the chat use-case, and have the gateway/listener observe it and broadcast `mensaje_chat`.
- **Constraint**: Ensure the event listener handling chat messages remains extremely lightweight and synchronous (EventEmitter2 is in-process so the overhead is negligible, but avoid adding heavy computation there).

### Crucial Timing Rule (Emit AFTER State Consistency)
In all refactored mutations (G1, G2, G3), the domain event **MUST** be emitted **AFTER** the state computation/persistence is successfully written to the database or cache. Emitting before the state is consistent results in race conditions where client socket broadcasts contain stale or null payload values (such as the Westeros bug).

**Acceptance (G):** `rg "broadcastToRoom|RoomBroadcasterService" src` outside the gateway,
`room-broadcaster.service.ts`, and `room-broadcast.module.ts` returns nothing. All existing socket event names unchanged; frontend still works.

---

# PR H — Rename/move the misnamed `*.websocket.ts` use-cases

**Effort:** 1.5h · **Depends on:** PR C, PR G · **Goal:** stop calling application logic
"websocket." These files are invoked by REST now — the name and folder lie about intent
(violates Screaming Architecture).

**Move to `application/use-cases/` and rename `*.use-case.ts`:**
- `votos/infrastructure/websockets/submit-answer.websocket.ts`
- `votos/infrastructure/websockets/evaluate-consensus.websocket.ts`
- `votos/infrastructure/websockets/process-audience-vote.websocket.ts`
- `votos/infrastructure/websockets/validate-vote-uniqueness.websocket.ts`
- `rondas/infrastructure/websockets/release-question.websocket.ts`
- `comodines/infrastructure/websockets/activate-call-joker.websocket.ts`
- `comodines/infrastructure/websockets/send-hint.websocket.ts`
- `salas/infrastructure/websockets/toggle-room-enabled.websocket.ts`
- `chat/infrastructure/websockets/send-message.websocket.ts`

**Keep as-is (genuinely WS lifecycle — the name fits):**
- `salas/infrastructure/websockets/handle-join-room.websocket.ts`
- `salas/infrastructure/websockets/handle-disconnect.websocket.ts`

Steps:
1. Move + rename one file at a time.
2. Update all imports (module providers, controllers, other use-cases, specs).
3. Rename the class if it carries `Websocket` in its name (e.g. `SubmitAnswerWebsocket`
   → `SubmitAnswerUseCase`) — update the DI token references.
4. Run the full test suite after EACH move — this is import-churn heavy.

> Do this LAST and incrementally. It touches many imports; a green test suite (PR C)
> after each move is the safety net. Do not batch all moves into one untested jump.

**Acceptance:** `fd -e ts '.websocket' src` returns only the two lifecycle handlers.
All tests green.

---

# PR J — (Optional) Stats as an event-driven observer

**Effort:** scope later · **Goal:** if desired, turn `reportes`/statistics into a
projection that OBSERVES `CONSENSO_EVALUADO` / finalize events and maintains a read model,
instead of aggregating from the DB on demand.

This is a genuine architectural upgrade but a larger change. Only pursue if on-demand
aggregation becomes a bottleneck or the team wants event-sourced stats. Spec separately.

---

## Notes for the implementing agent

- **Socket Event-Name Invariant**: The socket event names (`comodin_bloqueado`, `voto_recibido`, `participantes`) emitted to clients MUST not change. Diff the broadcast strings before and after to prevent regressions.
- **Safety Net First**: PR C (the automated tokenless participant security/auth tests) is fully implemented and green. These E2E tests must be run as a safety net before and after G and H modifications.
- Mirror `ConsensusListener` for any new decoupled observer; mirror the gateway
  `@OnEvent` handlers for translation-only observers.
- Do NOT create observers with no consumer or fan-out for its own sake. Single-observer
  events are fine — the value is the domain↔transport decoupling.
- Order matters: I → G → H.
