# ADR-003: REST Mutations Must Broadcast

## Status
Accepted

## Context
In our multiplayer real-time game architecture, players (hosts, students, observers) interact through a combination of REST APIs (for mutations like posting chat messages, casting consensus votes, submitting answers, and using jokers/wildcards) and WebSockets (for receiving real-time state changes and events).

Previously, some state mutations done via REST did not guarantee that a real-time event was broadcasted back to all clients in the room, leading to UI desynchronization. Furthermore, real-time broadcasts must not leak authoritative server-side fields (such as `esCorrecta` on option lists or answers) to client devices, which could enable cheating.

## Decision
We establish the following rules for mutations in the system:

1. **State Mutations via REST must Broadcast**:
   - Any REST endpoint that modifies game state (e.g., answer submissions, joker uses, chat messages, votes) must broadcast the updated state or event to all socket clients in the room.
   - Example pattern: A student calls `POST /api/v1/salas/:salaId/respuestas` to submit an answer. If consensus is reached, the system must broadcast `consenso_evaluado` to the room.

2. **Strict Payload Sanitization on Broadcast**:
   - WebSocket events (such as `pregunta_liberada` or `ronda_iniciada`) must be sanitized.
   - Specifically, any arrays of options or choices sent to client sockets must **never** contain the `esCorrecta` attribute. The true answer is held in the server-side cache (Redis/Memory) and only revealed after rounds expire or consensus is evaluated.

3. **Tokenless Participant Auth for Game Actions**:
   - Participants (students/observers) do not have JWTs (only hosts have administrative JWTs).
   - Therefore, REST endpoints for participant actions (chat, votes, jokers, answers) must authenticate the user based on their `nickname` and the `salaId`/`tokenCompartido` in the database.
   - If the participant exists in the room, allow the action (`200`/`201`).
   - If the participant does not exist, return a `404 Not Found` (or `403 Forbidden` if role constraints are violated).

## Consequences
- **Robust Real-Time Sync**: UI states remain consistent between the host board, students, and observers.
- **Anti-Cheating Guarantee**: Since option listings emitted on WebSockets are stripped of `esCorrecta`, clients cannot inspect WebSocket payload frames to cheat.
- **Clear Security Model**: Clear distinction between admin JWT auth (host) and tokenless nickname auth (students/observers).
