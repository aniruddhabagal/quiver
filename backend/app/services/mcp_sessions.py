from __future__ import annotations

from typing import Any

from ..db import Database
from ..utils.ids import now, token


async def create_session(
    db: Database, loadout: dict[str, Any], key: dict[str, Any], protocol: str, client_info: Any
) -> str:
    sid = token(32)
    await db.mcp_sessions.insert_one(
        {
            "_id": sid,
            "loadout_id": loadout["_id"],
            "api_key_id": key["_id"],
            "protocol_version": protocol,
            "client_info": client_info if isinstance(client_info, dict) else None,
            "initialized": False,
            "created_at": now(),
            "last_seen_at": now(),
            "ended_at": None,
        }
    )
    return sid


async def lookup_session(db: Database, sid: str, loadout_id: str) -> dict[str, Any] | None:
    s = await db.mcp_sessions.find_one({"_id": sid, "loadout_id": loadout_id, "ended_at": None})
    if s:
        await db.mcp_sessions.update_one({"_id": sid}, {"$set": {"last_seen_at": now()}})
    return s


async def mark_initialized(db: Database, sid: str) -> None:
    await db.mcp_sessions.update_one({"_id": sid}, {"$set": {"initialized": True, "last_seen_at": now()}})


async def end_session(db: Database, sid: str, loadout_id: str) -> bool:
    res = await db.mcp_sessions.update_one(
        {"_id": sid, "loadout_id": loadout_id, "ended_at": None}, {"$set": {"ended_at": now()}}
    )
    return res.matched_count > 0
