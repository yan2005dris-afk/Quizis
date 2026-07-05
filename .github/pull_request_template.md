## Description
Please describe the changes introduced by this PR.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation / Maintenance

## Checklist for Real-time Game Mutations (ADR-003)
If this PR modifies game state (e.g., chat, votes, jokers, round answers):
- [ ] **Real-time Broadcast**: The state mutation is broadcasted via WebSockets (or triggers a domain event that broadcasts) to all clients in the room.
- [ ] **Payload Sanitization**: Any option listings or client-facing payloads have `esCorrecta` and other authoritative server-side fields stripped/sanitized.
- [ ] **Tokenless Auth**: Client actions are authenticated based on `nickname` + database checks (without JWT requirements for participants).
- [ ] **E2E / Integration Tests**: Added test coverage checking that both authorized and unauthorized participant requests return the correct status codes (e.g., 200/201 vs 403/404) and checking broadcast sanitization.

## Testing
Please describe how you verified these changes.
