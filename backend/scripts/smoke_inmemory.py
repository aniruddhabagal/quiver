"""Boot the real app on an in-memory Mongo for a local smoke run. Not for production.

uv run python scripts/smoke_inmemory.py
"""

from contextlib import asynccontextmanager

import uvicorn
from mongomock_motor import AsyncMongoMockClient

from app.config import settings
from app.db import ensure_indexes
from app.main import create_app
from app.services.holds import NoApprovals
from app.services.rate_limit import SlidingWindow
from app.utils.upstream import UpstreamClient

settings.probe_enabled = False
app = create_app()


@asynccontextmanager
async def smoke_lifespan(app_):
    app_.state.db = AsyncMongoMockClient()["quiver_smoke"]
    app_.state.upstream = UpstreamClient()
    app_.state.rate_limiter = SlidingWindow()
    app_.state.holds = NoApprovals()
    await ensure_indexes(app_.state.db)
    yield


app.router.lifespan_context = smoke_lifespan

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8010, log_level="warning")
