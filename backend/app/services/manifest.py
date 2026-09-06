from __future__ import annotations

from typing import Any

from ..db import Database
from ..utils.ids import now
from ..utils.upstream import UpstreamClient, UpstreamError


async def refresh_manifest(db: Database, upstream: UpstreamClient, server: dict[str, Any]) -> dict[str, Any]:
    """Fetch tools/list and store the outcome, good or bad, on the server."""
    try:
        result = await upstream.list_tools(server)
        update = {
            "manifest": {
                "tools": result.tools,
                "server_info": result.server_info,
                "protocol_version": result.protocol_version,
                "fetched_at": now(),
                "error": None,
            },
            "detected_transport": result.transport,
            "status": "degraded" if result.latency_ms > 1500 else "healthy",
            "last_probe": {"at": now(), "latency_ms": result.latency_ms, "error": None},
            "updated_at": now(),
        }
    except UpstreamError as err:
        manifest = server.get("manifest") or {
            "tools": [],
            "server_info": None,
            "protocol_version": None,
            "fetched_at": None,
        }
        update = {
            "manifest": {**manifest, "error": err.message},
            "status": "down",
            "last_probe": {"at": now(), "latency_ms": None, "error": err.message},
            "updated_at": now(),
        }
    await db.servers.update_one({"_id": server["_id"]}, {"$set": update})
    return {**server, **update}
