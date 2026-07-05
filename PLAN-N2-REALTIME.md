# N2 Real-Time Hardening — PR Plan

Handoff plan for the implementing agent. Each PR is self-contained: goal, files,
concrete steps, acceptance criteria, and gotchas. Anchored to real symbols.

## Root cause (read first)

The N2 migration moved game mutations from WebSocket handlers (which broadcast to
the room) to REST endpoints, but dropped two invariants:

1. **REST mutations no longer broadcast** — only the admin (HTTP caller) sees the
   new state; students/observers must refresh.
2. **Authority leaked to the client** — correctness (`esCorrecta`), and participant
   identity were trusted from the request body / a JWT that participants never have.

This caused: chat broken, role change needs refresh, room restart needs refresh,
correct answers marked incorrect (the "Westeros" bug), and a cheating hole.

## Canonical pattern (copy this, do not invent)

Reference pair — the one flow already wired correctly end-to-end:

- Emit from use-case: `this.eventEmitter.emit(GameEvents.X, payload)`
- Listen + broadcast in gateway: `@OnEvent(GameEvents.X)` →
  `this.roomBroadcaster.broadcastToRoom(token, 'nombre_evento', payload)`
- Sanitize sensitive fields (`esCorrecta`) in the gateway handler before broadcast.

Canonical example: `JuegoGateway.handleRondaReiniciada` (`juego.gateway.ts:261`)
and its (currently unwired) partner `RestartRoundUseCase`.

## Execution order (weekly)

| Order | PR | Effort | Why this slot |
|-------|----|--------|---------------|
| 1 | **A** | 1.5h | Closes the most urgent hole (token / finalize) |
| 2 | **B** | 1h | Verify no other frontend component is stranded |
| 3 | **D** | 30min | Small, high value — prevents future repeats |
| 4 | **C** | 2h | Real coverage BEFORE any refactor, to guard E/F |
| 5 | **E** | ~2.5h | Refactor — needs C's tests first |
| 6 | **F** | ~2h | Refactor — needs C's tests first |

---

# PR A — Broadcast on `finalizeRoom` + `regenerateRoomToken`

**Effort:** 1.5h · **Goal:** close the N2 cycle. Both mutations change game state
but never notify sockets.

## A1. finalizeRoom (critical)

**File:** `backend/src/juego/salas/application/use-cases/finalize-room.use-case.ts`

Sets `FINALIZADO`, clears chat, disables room — but emits nothing. Participants
hang until manual refresh.

1. Inject `EventEmitter2` in the constructor (lines 17-22), import from
   `@nestjs/event-emitter`.
2. After the cache ops (line 86), emit:
   ```ts
   this.eventEmitter.emit(GameEvents.SALA.ESTADO_CAMBIADO, {
     tokenCompartido: sala.tokenCompartido,
     estado: EstadoSala.FINALIZADO,
   });
   ```
   `GameEvents.SALA.ESTADO_CAMBIADO` already exists (`game-events.types.ts:5`).
3. **Gateway** (`juego.gateway.ts`) — add handler (none exists for `ESTADO_CAMBIADO`):
   ```ts
   @OnEvent(GameEvents.SALA.ESTADO_CAMBIADO)
   handleEstadoCambiado(payload: { tokenCompartido: string; estado: string }) {
     this.roomBroadcaster.broadcastToRoom(
       payload.tokenCompartido, 'estado_sala_cambiado', payload,
     );
   }
   ```
4. **Frontend** (`game-socket.service.ts`) — subscribe `estado_sala_cambiado`; when
   `estado === 'FINALIZADO'`, navigate to results/statistics.

**Acceptance:** admin finalizes → connected students/observers land on the final
screen WITHOUT refreshing.

## A2. regenerateRoomToken

**File:** `backend/src/juego/salas/application/use-cases/regenerate-room-token.use-case.ts`

Changes `tokenCompartido` in DB (lines 30-33), returns the new link only to the admin.

> ⚠️ **DECISION NEEDED before coding** — on token regeneration, should already-
> connected participants (joined via the old token) be kicked, or is only the invite
> link invalidated for new joins? This changes the broadcast target. Ask the owner.

Steps (assuming "notify, don't kick"):
1. Inject `EventEmitter2`.
2. Add `TOKEN_REGENERADO: 'sala.token_regenerado'` to `GameEvents.SALA`.
3. Emit after the update with `{ tokenCompartidoViejo, tokenCompartidoNuevo }`.
4. Gateway: `@OnEvent` → broadcast to the OLD token's room (sockets are still there)
   with `'token_regenerado'`.
5. Frontend: update the displayed invite link live.

## Siblings (same pattern — track or fold in)

These are the same "REST mutation without broadcast" defect. Confirm whether they are
already handled by in-flight work; if not, they belong with PR A:

- **Role change** — `UpdateParticipantRoleUseCase` (`update-participant-role.use-case.ts`)
  writes DB, emits nothing. Needs an event → gateway broadcast → frontend update so
  the affected participant's role changes live.
- **Restart emit** — `RestartRoundUseCase` (`restart-round.use-case.ts`). The event
  (`GameEvents.RONDAS.RONDA_REINICIADA`), the interface (`RondaReiniciadaEvent`), and
  the gateway handler (`juego.gateway.ts:261`) ALL exist. Only the use-case emit is
  missing — inject `EventEmitter2` and emit the event with the returned `rondaActiva`.

---

# PR B — Frontend broadcast audit

**Effort:** 1h · **Goal:** find REST mutations that rely only on the HTTP response and
don't subscribe to the corresponding socket event (expect 0-3 more sites). **Map only,
do not fix here.**

Steps:
1. List API-service mutations:
   ```
   rg -n "Observable|post\(|patch\(|put\(|delete\(" frontend/src/app/core/services/game-api.service.ts
   ```
2. For each game-state mutation, confirm `game-socket.service.ts` has a matching
   `this.socket.on('<event>', ...)` that updates state.
3. Coverage checklist:

   | Mutation | Expected socket event | Subscribed? |
   |----------|----------------------|-------------|
   | release question | `pregunta_liberada` | verify |
   | restart round | `ronda_reiniciada` | verify |
   | finalize | `estado_sala_cambiado` (PR A1) | add |
   | change role | (pending backend broadcast) | verify |
   | submit answer | `consenso_evaluado` | verify |

4. Document each gap as `file:line`.

**Output:** a table of gaps. No code changes.

---

# PR D — ADR + PR checklist

**Effort:** 30min · **Goal:** prevent the systemic "REST mutation without broadcast"
defect from recurring.

## D1. ADR

**File:** `docs/adr/ADR-003-rest-mutations-must-broadcast.md`

Three decisions:
1. Every REST mutation on game state MUST emit a domain event (`GameEvents.*`) for the
   socket broadcast. The HTTP response serves only the caller; other participants learn
   via WS.
2. Data authority is the DB, never the client. Correctness (`esCorrecta`), roles, and
   states are loaded/validated server-side. Never trust the body for business logic.
3. Broadcasts to participants MUST strip sensitive data (`esCorrecta` out of student
   payloads).

Context: the N2 REST migration broke all three → chat, role, restart, and the
answer-correctness bugs.

## D2. PR template

**File:** `.github/pull_request_template.md` — add:

```markdown
### Real-time game (if you touch sala/ronda mutations)
- [ ] Does the mutation emit a GameEvent for the socket broadcast?
- [ ] Is there an @OnEvent handler in JuegoGateway that listens for it?
- [ ] Does the frontend subscribe to the event and update state?
- [ ] Does the student payload EXCLUDE esCorrecta / sensitive data?
- [ ] Does business logic use the DB as source of truth, not the body?
```

---

# PR C — Rewrite security E2E tests

**Effort:** 2h · **Goal:** real coverage of the three broken invariants. Must land
BEFORE the E/F refactors so they can be validated.

**Location:** `backend/test/` (jest-e2e / jest-integration — see `package.json:21-22`).

Mandatory scenarios:
1. **Tokenless participant auth** — a student/observer WITHOUT a JWT (only
   `tokenCompartido + nickname`) can:
   - `POST /api/v1/salas/:token/mensajes` (chat) → 200/201, not 401
   - `POST /api/v1/salas/:token/votos` → OK
   - `POST /api/v1/salas/:token/comodines/...` → OK
2. **`esCorrecta` never leaks** — capture the `pregunta_liberada` and `ronda_reiniciada`
   broadcast payloads: NO option may carry `esCorrecta`.
3. **Client cannot forge correctness** — submit the wrong option while injecting
   `esCorrecta: true` in the body → backend evaluates against the DB → result
   `esCorrecta: false`.

**Acceptance:** all three FAIL against today's unpatched code (red), pass after E/F
(green). That proves real coverage, not smoke.

---

# PR E — `esCorrecta` authority from DB (refactor)

**Effort:** ~2.5h · **Depends on:** PR C (scenarios 2 & 3) · **Goal:** fix the
"Westeros" bug and close the cheating hole. Correctness must come from the DB, never
the client.

Current flaw: `POST /salas/by-token/:salaId/preguntas/liberar` takes the full
`pregunta` (with `opciones` + `esCorrecta`) from the request body
(`salas-by-token.controller.ts:91`), caches it, and later validates answers against
that client-supplied `esCorrecta` (`submit-answer.websocket.ts:127`). Because
`esCorrecta` is optional and round-trips through the browser, it arrives `undefined`
→ `?? false` → every answer marked incorrect.

Steps:
1. **Backend** — change `liberar` to accept only identifiers (`preguntaId`, plus
   `rondaId` if needed), NOT the full pregunta.
2. Load the question + options (with `esCorrecta`) from the DB by `preguntaId` (Prisma).
   That is the authoritative version.
3. Cache THAT version as the active question → `submit-answer` now reads real
   `esCorrecta`.
4. When broadcasting `pregunta_liberada`, strip `esCorrecta` from options (mirror the
   `handleRondaReiniciada` sanitization at `juego.gateway.ts:269-272`).
5. **Frontend** — stop sending the full pregunta in `liberarPregunta`; send only
   `preguntaId`. The ✓ for display comes from the submit response (`ResultRespuesta`
   with `esCorrecta` + `winningOpcionId`), so the release payload doesn't need it.

**Acceptance:** answering the correct option returns `esCorrecta: true`; PR C
scenarios 2 & 3 pass.

---

# PR F — Participant auth + chat consolidation (refactor)

**Effort:** ~2h · **Depends on:** PR C (scenario 1) · **Goal:** unbreak chat for
students and stop the "please authenticate" prompt for student/observer roles.

Three defects on the participant-facing REST endpoints:

1. **Double `/api/v1` prefix (404).** `setGlobalPrefix('api/v1')` (`main.ts:31`) is
   already applied, but these controllers hardcode `api/v1` on top → real route
   `/api/v1/api/v1/...`:
   - `chat/interfaces/controllers/mensajes.controller.ts:29`
   - `comodines/interfaces/controllers/comodines-rest.controller.ts:32`
   - `votos/interfaces/controllers/votos-rest.controller.ts:26`
   Fix: use relative paths (`salas/:salaId/mensajes`, `.../comodines`, `.../votos`).

2. **JWT guard on tokenless participants (401).** These three carry
   `@UseGuards(JwtAuthGuard)`, but students/observers join via shared link, no JWT.
   Fix: remove the guard AND add participant validation by `tokenCompartido + nickname`
   — the correct model is already documented in `respuestas.controller.ts:20-28`
   (no guard, validates token + nickname + rol). Copy that.
   > Do NOT just remove the guard — that opens the endpoint. Validation is required.
   > Note `mensajes.controller` currently reads `req.user` (from JWT) for the nickname;
   > without the guard, pass `nickname` in the body/param and validate it against the DB.

3. **Chat has no broadcast.** `SendMessageWebsocket.execute()`
   (`chat/infrastructure/websockets/send-message.websocket.ts`) only writes to cache and
   returns — it never emits `mensaje_chat`. Fix: after `chatCache.addMessage()`, emit to
   the room via `RoomBroadcasterService`; `ChatModule` must import `RoomBroadcastModule`
   and `SendMessageWebsocket` must inject the broadcaster.

**Acceptance:** a student sends a chat message via REST → it reaches other participants
live, no 404, no 401; PR C scenario 1 passes.

---

## Notes for the implementing agent

- Always start from the reference pair: `JuegoGateway.handleRondaReiniciada`
  (`juego.gateway.ts:261`) + `RestartRoundUseCase`. Copy that emit/OnEvent/sanitize
  shape; don't design a new one.
- PRs A, B, D are independent and can ship in any order.
- PRs E and F are refactors — land PR C first so its tests validate them.
- **E and F scope is inferred** from the session's open architectural items; confirm
  with the owner before starting if the intended scope differs.
