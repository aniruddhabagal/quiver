from __future__ import annotations

import json
from typing import Any

from ..db import Database
from ..utils.ids import iso, new_id, now

PREVIEW_CAP = 2048


def preview_of(result: dict[str, Any] | None) -> tuple[str | None, int]:
    if not result:
        return None, 0
    blob = json.dumps(result, default=str)
    texts = [c.get("text", "") for c in result.get("content") or [] if isinstance(c, dict) and c.get("type") == "text"]
    text = "\n".join(texts) if texts else blob
    return text[:PREVIEW_CAP], len(blob)


async def start_call(db: Database, **fields: Any) -> dict[str, Any]:
    doc = {
        "_id": new_id("c"),
        "status": "running",
        "args_redacted": {},
        "result_preview": None,
        "result_size": 0,
        "is_error": False,
        "error_message": None,
        "approval_id": None,
        "started_at": now(),
        "finished_at": None,
        "duration_ms": None,
        "policy_trace": [],
        **fields,
    }
    await db.calls.insert_one(doc)
    return doc


async def finish_call(db: Database, call: dict[str, Any], **fields: Any) -> dict[str, Any]:
    finished = now()
    update = {
        "finished_at": finished,
        "duration_ms": int((finished - call["started_at"]).total_seconds() * 1000),
        **fields,
    }
    await db.calls.update_one({"_id": call["_id"]}, {"$set": update})
    return {**call, **update}


def serialize_call(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": c["_id"],
        "loadout_id": c["loadout_id"],
        "loadout_slug": c.get("loadout_slug", ""),
        "tool_id": c.get("tool_id"),
        "alias": c["alias"],
        "server_id": c.get("server_id"),
        "server_name": c.get("server_name", ""),
        "upstream_name": c.get("upstream_name", ""),
        "agent": c.get("agent", ""),
        "api_key_name": c.get("api_key_name"),
        "source": c.get("source", "mcp"),
        "args_redacted": c.get("args_redacted", {}),
        "result_preview": c.get("result_preview"),
        "result_size": c.get("result_size", 0),
        "is_error": bool(c.get("is_error")),
        "status": c["status"],
        "error_message": c.get("error_message"),
        "approval_id": c.get("approval_id"),
        "started_at": iso(c["started_at"]),
        "finished_at": iso(c.get("finished_at")),
        "duration_ms": c.get("duration_ms"),
        "policy_trace": c.get("policy_trace", []),
    }
