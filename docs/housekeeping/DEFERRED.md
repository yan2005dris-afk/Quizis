# Housekeeping — deferred bugs

This document tracks housekeeping bugs that **could not be fixed in the
`fix/housekeeping-bugs` branch** because they only exist in feature
branches that haven't been merged to develop yet.

## Bug #4 — `cambiarRolParticipante` REST doesn't broadcast `participantes`

**File**: `backend/src/juego/salas/interfaces/controllers/salas-by-token.controller.ts` (only exists in `feature/rest-n1-frontend` and `feature/rest-n2-frontend`)

**Why deferred**: The REST controller that exposes the new role-change endpoint
was added in N1/N2 SDDs (see `sdd/quizis-rest-n1-mutations`, `sdd/quizis-rest-n2-mutations`).
Those PRs are open but not yet merged. The corresponding `update-participant-role`
use-case doesn't emit any broadcast. The old WS handler used to broadcast
`participantes` after the role change.

**Fix when N1 PR #69 / N2 PR #71 lands**: inject `RoomBroadcasterService` into
`SalasByTokenController.cambiarRol()` and broadcast `participantes` after the use-case
returns.

## Bug #5 — no supertest integration tests for new REST endpoints

**Files**: All 12 new REST controllers from N1 + N2
(`salas-by-token.controller.ts`, `respuestas.controller.ts`, `votos-rest.controller.ts`,
`mensajes.controller.ts`, `comodines-rest.controller.ts`).

**Why deferred**: Same reason as #4 — the controllers don't exist in `develop`.

**Fix when N1 PR #69 / N2 PR #71 land**: add a supertest integration test for
at least one happy path + one error path per controller. Estimated ~200 lines
of new test code.

## Why not fix in this branch?

The `fix/housekeeping-bugs` branch was created from `develop` to keep the
housekeeping changes small and reviewable independently. The REST controllers
will exist in `develop` after N1 + N2 PRs merge. At that point:
1. Re-open this branch from new `develop`
2. Apply the bug #4 + #5 fixes
3. Open a follow-up PR

## Bugs already fixed in this branch

- **#1**: CORS wildcard → env-configured origins ✅
- **#2**: Unused `@ConnectedSocket() client` param → renamed to `_client` ✅
- **#3**: `JSON.parse(localStorage...)` without try/catch → wrapped ✅
