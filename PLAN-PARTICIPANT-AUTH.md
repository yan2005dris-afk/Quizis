# Participant Role Authorization — PR Plan (PR K)

Handoff plan for the implementing agent. Goal: replace the duplicated, inconsistent
per-controller participant validation with a single declarative guard, and make admin
identity **non-spoofable** (JWT-verified sala ownership) instead of trusting a `Host-`
nickname prefix.

## Context — what's wrong today

There are TWO separate role axes, and they must not be conflated:
- **Identity axis** (`Roles`/`Permisos`/`RolPermisos` + `PermissionsGuard`): authenticated
  platform users (JWT). Used for "who can create salas / manage bancos." NOT for in-game roles.
- **Participant axis** (`Participantes.rol`): per-sala, tokenless — `estudiante` / `observador`.
  Admin is a real user (`Salas.adminId → Usuarios.usuarioId`), NOT a participant row.

Current problems on the participant axis:
1. `resolveParticipante` (nickname → `findFirst` on `participantes` → 404) is duplicated in
   4 controllers: `mensajes` (chat), `votos-rest`, `respuestas`, `comodines-rest`.
2. Role checks are scattered and inconsistent: chat allows estudiante/observador (excludes
   admin), votos requires observador, respuestas requires estudiante, comodines enforces
   NOTHING at the controller ("rules enforced in use-cases" — but they aren't reliably).
3. `comodines-rest` trusts **any** `nickname` starting with `Host-` as admin — a spoofable
   admin backdoor (documented in its own SECURITY NOTE). A malicious participant could send
   `nickname: 'Host-anything'` and be treated as admin.

## Target model — hybrid ParticipantRoleGuard

One guard for the participant axis, mirroring `@Public` + `JwtAuthGuard` (SetMetadata +
Reflector). Admin is verified by JWT ownership; students/observers by nickname.

Role resolution inside the guard:
1. **If a valid `Authorization: Bearer` token is present** AND the token's user is the sala's
   admin (`sala.adminId === user.usersId`, same check as `SalaAdminGuard`) → role = `admin`.
   (Non-spoofable — the admin already sends the JWT via the auth interceptor.)
2. **Else** → tokenless: read `body.nickname`, `findFirst` on `Participantes` by
   `tokenCompartido + nickname` → role from `participante.rol` (estudiante/observador).
   404 if no participant, 400 if nickname missing.
3. Compare resolved role against the endpoint's `@ParticipantRoles(...)` → **403** if not allowed.
4. Attach the resolution to `req.participante = { role, participanteId?, userId? }` so
   controllers/use-cases stop re-querying.

> The `Host-` prefix is NO LONGER an auth mechanism. It may remain as a display label, but
> the guard must never grant admin based on it. Delete the `startsWith('Host-')` admin
> short-circuit in `comodines-rest.controller`.

## Role matrix (single source of truth)

| Endpoint | `@ParticipantRoles(...)` |
|----------|--------------------------|
| comodines (all: bloquear, llamada/activar, llamada/pista) | `estudiante` |
| chat (`mensajes`) | `admin`, `estudiante`, `observador` |
| votos (`votos-rest`) | `observador` |
| respuestas | `estudiante` |

## Implementation steps

1. **Create** `src/juego/shared/auth/participant-roles.decorator.ts`:
   ```ts
   export const PARTICIPANT_ROLES_KEY = 'participantRoles';
   export const ParticipantRoles = (...roles: string[]) =>
     SetMetadata(PARTICIPANT_ROLES_KEY, roles);
   ```
2. **Create** `src/juego/shared/auth/participant-role.guard.ts`:
   - Inject `Reflector`, `PrismaService`, `JwtService` (+ config for the JWT secret, same
     as the passport-jwt strategy uses).
   - Read required roles via `reflector.getAllAndOverride(PARTICIPANT_ROLES_KEY, [...])`.
   - Resolve `tokenCompartido` from `request.params.salaId` (it IS the tokenCompartido —
     see `SalaAdminGuard` comment).
   - Admin branch: extract Bearer token from `Authorization` header; if it verifies, load the
     sala (`select: { adminId }`) and compare to the token's user id. On match → role `admin`.
   - Participant branch (no/invalid token, or not the admin): `body.nickname` →
     `findFirst` participantes → role. Throw 404/400 as appropriate.
   - Role check → `ForbiddenException` (403) if not in the allowed set.
   - Set `request.participante = { role, participanteId, userId }`.
3. **Apply** to the 4 controllers: add `@UseGuards(ParticipantRoleGuard)` at class or method
   level and `@ParticipantRoles(...)` per the matrix.
4. **Delete** the 4 duplicated `resolveParticipante`/inline validations; controllers read
   `req.participante` instead. Remove the `Host-` admin trust from `comodines-rest`.
5. **Comodines**: the admin now correctly gets **403** (comodines are estudiante-only), not a
   confusing 404. Verify the use-cases no longer need their own role checks (guard covers it).

## Frontend gap (does NOT close via the guard)

Comodines are estudiante-only, so the admin's UI must not offer comodín controls. Today the
admin can trigger "activar público" (`active-question.component.ts`) → it will now 403.
Gate the comodín controls to `rol === 'estudiante'` in the frontend so the admin/observer
never see or fire them. Separate, small change.

> Chat needs no frontend change: the admin's requests already carry the JWT (auth
> interceptor), so the guard's admin branch authorizes them. Students/observers send nickname.

## Tests (this closes the PR C gap)

With the guard, coverage is centralized. Add to `backend/test/`:
1. **Guard unit/integration**: admin JWT + owns sala → role admin; admin JWT + different sala
   → not admin; valid nickname → correct role; missing nickname → 404/400; wrong role → 403.
2. **Per-endpoint (E2E)** using the matrix:
   - comodines with estudiante nickname → 200; with observador → 403; with admin JWT → 403.
   - chat with estudiante/observador nickname → 200; with admin JWT → 200; unknown nickname → 404.
   - votos with observador → 200; with estudiante → 403.
   - **Spoof test (critical)**: `nickname: 'Host-whatever'` with NO valid JWT → NOT treated as
     admin (403/404). This proves the spoof hole is closed.

## Order

1. Guard + decorator + apply matrix + delete duplicates (backend).
2. Frontend: gate comodín controls to estudiante.
3. Tests (closes PR C).

## Notes for the implementing agent

- Reuse `SalaAdminGuard`'s ownership check logic for the admin branch — do not reinvent it.
- The guard reads `request.body` — this is available in guards (body-parser runs before guards).
- Do NOT wire this into the identity `PermissionsGuard`; it is a different axis (tokenless,
  per-sala participant role) and participants have no JWT / identity Role.
- The admin JWT verification must fail CLOSED: an invalid/expired token falls through to the
  tokenless path (which will 403/404 for admin-only... i.e. it just won't grant admin), never
  grants admin on a bad token.
