from __future__ import annotations

import asyncio
import logging
from typing import Any

from ..config import settings
from ..db import Database
from ..utils.broadcaster import broadcaster
from .manifest import refresh_manifest

log = logging.getLogger("quiver.probe")


async def probe_server(db: Database, upstream: Any, server: dict[str, Any]) -> dict[str, Any]:
    updated = await refresh_manifest(db, upstream, server)
    await broadcaster.publish(
        server["user_id"],
        "server.status",
        {"server_id": server["_id"], "status": updated["status"], "latency_ms": updated["last_probe"]["latency_ms"]},
    )
    return updated


async def probe_loop(db: Database, upstream: Any) -> None:
    """Every probe_interval_s, probe each server one after another. Never crashes the app."""
    while True:
        try:
            await asyncio.sleep(settings.probe_interval_s)
            async for server in db.servers.find({}):
                try:
                    await probe_server(db, upstream, server)
                except Exception:  # noqa: BLE001
                    log.exception("probe failed for %s", server.get("name"))
        except asyncio.CancelledError:
            return
        except Exception:  # noqa: BLE001
            log.exception("probe loop error")
