# N2 Frontend Broadcast Audit

Generated as part of PR B in PLAN-N2-REALTIME.md. Map-only — no code changes
proposed. Confirms which REST mutations have a matching WS event subscribed
on the frontend, and flags the gaps.

## Coverage table

| Mutation (REST)                                          | Source                                       | Expected socket event             | Subscribed?                                                | Status   |
|----------------------------------------------------------|----------------------------------------------|-----------------------------------|-------------------------------------------------------------|----------|
| submit answer                                            | `game-api.service.ts:84`                   | `pregunta_respondida`             | yes (línea 269)                                             | ✅       |
| updateEstadoSala (→ EN_VIVO)                             | `game-api.service.ts:93`                   | `sala.iniciada` / `info_ronda`    | yes (línea 416)                                             | ✅       |
| updateEstadoSala (→ FINALIZADO)                          | `game-api.service.ts:93`                   | `estado_sala_cambiado` (PR A1)    | yes (línea 425)                                             | ✅       |
| liberarPregunta                                          | `game-api.service.ts:107`                  | `pregunta_liberada`               | yes (línea 167)                                             | ✅       |
| regenerarToken                                           | `game-api.service.ts:126`                  | `token_regenerado` (PR A2)        | yes (PR A2 handler)                                         | ✅       |
| finalizarPartida                                         | `game-api.service.ts:137`                  | `estado_sala_cambiado` (PR A1)    | yes (línea 425) — already covered by A1                    | ✅       |
| reiniciarRonda                                           | `game-api.service.ts:146`                  | `ronda_reiniciada`                | yes (línea 458)                                             | ✅       |
| cambiarRolParticipante                                   | `game-api.service.ts:155`                  | `participantes`                   | yes (línea 411)                                             | ✅       |
| votar                                                    | `game-api.service.ts:170`                  | `voto_recibido`                   | yes (línea 256)                                             | ✅       |
| enviarMensaje                                            | `game-api.service.ts:183`                  | `mensaje_chat`                    | yes (línea 400)                                             | ✅       |
| bloquearComodin                                           | `game-api.service.ts:195`                  | `comodines_bloqueados`            | yes (línea 328)                                             | ✅       |
| activarComodinLlamada                                    | `game-api.service.ts:204`                  | `consultor_seleccionado`          | yes (línea 338)                                             | ✅       |
| enviarPistaConsultor                                     | `game-api.service.ts:213`                  | `pista_consultor_recibida`        | yes (línea 351)                                             | ✅       |

## Gaps found

**None.** Every REST mutation in `game-api.service.ts` has a matching WS
handler in `game-socket.service.ts` that updates client state.

## Notes

- `sala_estado_cambiado` (línea 386, shape `{ habilitada: boolean }`) is a
  separate event from `estado_sala_cambiado` (línea 425, shape
  `{ tokenCompartido, estado }`). The former predates the N2 migration
  and is not emitted by any current backend use-case (verified by
  searching `eventEmitter.emit`). It's a dead listener. Recommend
  removing in a follow-up cleanup PR (not N2 scope).
- `partida_finalizada` (línea 390) — same: legacy handler, not emitted
  by any current code. Dead listener.
- `transicion_pregunta` (línea 241) — same: legacy, not emitted.
  Dead listener.
- The new events added by PR A1 (`estado_sala_cambiado`) and PR A2
  (`token_regenerado`) are properly subscribed. The frontend-side
  `salaFinalizadaWs` signal from PR A1 drives the navigation-to-results
  flow in `game-session.component.ts:navigateOnFinalizacion`. The
  `tokenInvitacionRegenerado` signal from PR A2 is exposed for future
  UI updates; no consumer reads it yet because the admin's own
  `tokenInvitacion` signal is already updated locally when the admin
  triggers the regeneration.

## Conclusion

The N2 REST migration's "no broadcast" defect has been fully remediated
across both backend (use-case emits) and frontend (socket handler). The
canonical pattern documented in ADR-003 (forthcoming in PR D) is
consistently applied.

Three legacy listeners remain as dead code (`sala_estado_cambiado`,
`partida_finalizada`, `transicion_pregunta`). Cleanup PR recommended
but out of scope for the N2 realtime-hardening work.
