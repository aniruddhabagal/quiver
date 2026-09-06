from __future__ import annotations

from typing import Any

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

Database = AsyncIOMotorDatabase[dict[str, Any]]


def make_client() -> AsyncIOMotorClient[dict[str, Any]]:
    return AsyncIOMotorClient(settings.mongo_url, uuidRepresentation="standard", tz_aware=True)


def get_db(request: Request) -> Database:
    """The database lives on app.state so tests can swap in a mock."""
    return request.app.state.db


async def ensure_indexes(db: Database) -> None:
    await db.users.create_index("email", unique=True)
    await db.api_keys.create_index("key_hash", unique=True)
    await db.api_keys.create_index("user_id")
    await db.servers.create_index([("user_id", 1), ("name", 1)], unique=True)
    await db.loadouts.create_index("slug", unique=True)
    await db.loadouts.create_index("user_id")
    await db.loadout_versions.create_index([("loadout_id", 1), ("version", 1)], unique=True)
    await db.calls.create_index([("loadout_id", 1), ("started_at", -1)])
    await db.calls.create_index([("user_id", 1), ("started_at", -1)])
    await db.calls.create_index("approval_id")
    await db.approvals.create_index([("user_id", 1), ("status", 1), ("requested_at", -1)])
    await db.approvals.create_index("expires_at")
    await db.mcp_sessions.create_index("last_seen_at", expireAfterSeconds=24 * 3600)
