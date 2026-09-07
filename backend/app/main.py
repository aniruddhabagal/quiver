from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import ensure_indexes, make_client
from .routers import api_keys, auth, calls, loadouts, mcp_endpoint, servers
from .services.health_probe import probe_loop
from .services.holds import NoApprovals
from .services.rate_limit import SlidingWindow
from .utils.upstream import UpstreamClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("quiver")

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = make_client()
    app.state.mongo = client
    app.state.db = client[settings.mongo_db]
    app.state.upstream = UpstreamClient()
    app.state.rate_limiter = SlidingWindow()
    app.state.holds = NoApprovals()
    try:
        await ensure_indexes(app.state.db)
    except Exception:  # noqa: BLE001
        log.exception("could not ensure indexes; continuing")
    tasks: list[asyncio.Task] = []
    if settings.probe_enabled:
        tasks.append(asyncio.create_task(probe_loop(app.state.db, app.state.upstream)))
    log.info("quiver up, db=%s origins=%s", settings.mongo_db, settings.origins)
    try:
        yield
    finally:
        for t in tasks:
            t.cancel()
        client.close()


def create_app() -> FastAPI:
    app = FastAPI(title="Quiver", version="0.1.0", lifespan=lifespan, docs_url="/docs", redoc_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Mcp-Session-Id"],
    )
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(api_keys.router, prefix=API_PREFIX)
    app.include_router(servers.router, prefix=API_PREFIX)
    app.include_router(loadouts.router, prefix=API_PREFIX)
    app.include_router(calls.router, prefix=API_PREFIX)
    app.include_router(mcp_endpoint.router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict:
        return {"ok": True, "service": "quiver", "version": "0.1.0"}

    return app


app = create_app()
