# Quiver

Curated, governed virtual MCP servers.

Give your agent twelve tools, not two hundred. Quiver composes a small,
well-described toolset from all your MCP servers, publishes it as one
endpoint, and holds dangerous calls until a human says go.

Status: landing page, app shell with demo mode, and the backend foundation
(auth, API keys, servers with a real MCP SDK client) are built. The virtual MCP
endpoint, policy engine and approvals follow in the next phases. See `CLAUDE.md`
for the plan and progress.

## What Quiver will do

- Connect your remote MCP servers and pull their tool manifests.
- Build a loadout: a small set of tools with aliases, rewritten descriptions,
  pinned arguments, hidden arguments, and a policy on each (allow, approve,
  deny, rate limit, redaction, timeout).
- Publish the loadout as one MCP endpoint over Streamable HTTP with a scoped
  API key. Calls marked approve wait for a human before they reach upstream.
- Stream every call live, diff every version, and score how overloaded the
  agent is.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

`npm run build` type-checks and writes a static site to `frontend/dist/`.

## License

MIT

## Running it

Frontend only, in demo mode (sample data, simulated traffic):

```bash
cd frontend && npm install && npm run dev
```

Full stack:

```bash
cp .env.example .env            # set QUIVER_SECRET_KEY
docker compose up               # mongo + backend on :8010
cd frontend && VITE_API_URL=http://localhost:8010 npm run dev
```

Backend alone, against a local Mongo:

```bash
cd backend && uv sync && uv run uvicorn app.main:app --port 8010 --reload
uv run pytest                   # in-memory Mongo; set QUIVER_TEST_MONGO_URL for a real one
```

The backend is a single long-lived process: approvals hold HTTP requests open
and live updates ride one WebSocket, so it is not for serverless hosting.
