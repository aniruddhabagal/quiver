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

## Backend layout

`backend/app/{routers,schemas,services,dependencies,utils}`, one file per domain.
`config.py` holds a single pydantic `Settings` (env prefix `QUIVER_`). The Mongo
database and the upstream client live on `app.state` so tests swap in
`mongomock-motor` and `tests/fakes/upstream.py`. Upstream MCP servers are reached
through the official `mcp` SDK client (`utils/upstream.py`), one session per
call, Streamable HTTP first with an SSE fallback. Secrets are Fernet-encrypted
(`utils/crypto.py`) and never returned by the API.

Run: `uv sync`, `uv run uvicorn app.main:app --port 8010 --reload`, `uv run pytest`, `uv run ruff check .`.

## API so far

- `POST /api/v1/auth/signup|login|refresh`, `GET /api/v1/auth/me`
- `GET|POST /api/v1/keys`, `DELETE /api/v1/keys/{id}` (keys are `qv_…`, stored hashed, scope account or loadout)
- `GET|POST /api/v1/servers`, `GET|PATCH|DELETE /api/v1/servers/{id}`, `POST …/refresh-manifest`, `POST …/probe`, `GET …/tools`
- `GET|POST /api/v1/loadouts`, `GET|PATCH|DELETE /api/v1/loadouts/{id|slug}`, `PUT …/tools` (creates a version), `POST …/publish|unpublish`, `GET …/versions`, `POST …/versions/{v}/rollback`, `GET …/diff?from&to`, `GET …/preview` (tools/list as the agent sees it)
- `GET /api/v1/calls?loadout_id&status&q&limit`, `GET /api/v1/calls/{id}`, `GET /api/v1/calls/export`
- `POST /mcp/{slug}` (JSON-RPC: initialize, notifications/*, ping, tools/list, tools/call), `DELETE /mcp/{slug}` ends a session, `GET` → 405. Auth `Authorization: Bearer qv_…`; headers `Mcp-Session-Id`, `MCP-Protocol-Version` (2025-11-25, 2025-06-18, 2025-03-26)
- `GET /health`

## Call pipeline

`services/pipeline.run_tool_call` is the only path a tool call takes, from the MCP
endpoint or the playground: resolve alias → log start → rate limit → policy →
(hold) → strip hidden args, apply presets → upstream → redact result → log
finish. Denials are tool *results* with `isError: true` and a "Quiver: …" text;
only protocol problems become JSON-RPC errors. Redaction never touches the
arguments sent upstream, only what is stored, shown, or returned.

## Contracts

- WebSocket events: `call.started`, `call.decision`, `call.finished`,
  `approval.pending`, `approval.decided`, `server.status`, `ping`.
- Call statuses: `ok | error | denied | rate_limited | held_approved | held_denied | expired`.
- Policy modes: `allow | approve | deny`.
- Endpoint: `{API_URL}/mcp/{slug}` with `Authorization: Bearer qv_...`.

## Progress

- [x] Phase 1: landing page (frontend/src/routes/landing, hero canvas, motion, OG image)
- [x] Phase 2: app shell + demo mode (frontend/src/routes/app, lib/demo-*.ts, features/*)
- [x] Phase 3: backend foundation (auth, API keys, servers, MCP SDK upstream client, probes; frontend wired with demo fallback)
- [x] Phase 4: loadouts (curation, versions, overload score; editor verified against the API)
- [x] Phase 5: virtual MCP endpoint + policy engine (verified with the official MCP SDK as client)
- [ ] Phase 6: approvals + real-time (WebSocket, Slack)
- [ ] Phase 7: playground, analytics, export
- [ ] Phase 8: polish, docs, deployment
