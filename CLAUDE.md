# Quiver

Curated, governed virtual MCP servers. Compose a small toolset from many MCP
servers, publish it as one MCP endpoint, hold dangerous calls for human
approval. Pitch: "Give your agent twelve tools, not two hundred."

## Structure

```
quiver/
  frontend/   Vite + React 19 + TypeScript. Landing at /, app at /app/*.
  backend/    FastAPI + MongoDB (Motor). REST /api/v1, MCP /mcp/{slug}, WS /ws.
```

Ports: frontend dev 5182, backend 8010, mongo 27017 (compose).

## Conventions

- Commit after each completed unit. Messages prefixed `feat:` / `fix:` / `chore:`.
  No Co-Authored-By trailers.
- Frontend pre-commit: `npx tsc -b --noEmit` and `npm run lint` must pass.
- Backend pre-commit: `pytest` and `ruff check` must pass.
- Design: dark neon. Tokens live in `frontend/src/styles/tokens.css`; glow is
  reserved for the cartridge, live pulses, outcome stamps, the primary CTA and
  focus rings. One orchestrated motion moment per page. Reduced motion is
  respected everywhere.
- Never mount Lenis under `/app`; it breaks canvas zoom.
- Invoke the `frontend-design` skill before major UI work.

## Contracts

- WebSocket events: `call.started`, `call.decision`, `call.finished`,
  `approval.pending`, `approval.decided`, `server.status`, `ping`.
- Call statuses: `ok | error | denied | rate_limited | held_approved | held_denied | expired`.
- Policy modes: `allow | approve | deny`.
- Endpoint: `{API_URL}/mcp/{slug}` with `Authorization: Bearer qv_...`.

## Progress

- [x] Phase 1: landing page (frontend/src/routes/landing, hero canvas, motion, OG image)
- [x] Phase 2: app shell + demo mode (frontend/src/routes/app, lib/demo-*.ts, features/*)
- [~] Phase 3: backend foundation (auth, servers, upstream client)
- [ ] Phase 4: loadouts (curation, versions, overload score)
- [ ] Phase 5: virtual MCP endpoint + policy engine
- [ ] Phase 6: approvals + real-time (WebSocket, Slack)
- [ ] Phase 7: playground, analytics, export
- [ ] Phase 8: polish, docs, deployment
