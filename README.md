# Quiver

Curated, governed virtual MCP servers.

Give your agent twelve tools, not two hundred. Quiver composes a small,
well-described toolset from all your MCP servers, publishes it as one
endpoint, and holds dangerous calls until a human says go.

Status: the landing page is built (Phase 1). The app, the FastAPI + MongoDB
backend, the virtual MCP endpoint and approvals follow in later phases. See
`CLAUDE.md` for the plan and progress.

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
