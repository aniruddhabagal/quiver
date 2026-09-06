from __future__ import annotations

import hashlib
from typing import Any

from fastapi import Depends, Header, HTTPException, status

from ..db import Database, get_db
from ..utils.ids import iso, now
from ..utils.security import decode_token

Doc = dict[str, Any]


def _bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: Database = Depends(get_db),
) -> Doc:
    token = _bearer(authorization)
    payload = decode_token(token, "access") if token else None
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    user = await db.users.find_one({"_id": payload["sub"], "is_active": True})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    return user


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


async def resolve_api_key(db: Database, plaintext: str) -> Doc | None:
    """Look up a `qv_` key. Returns the key document or None; bumps last_used_at at most once a minute."""
    if not plaintext.startswith("qv_"):
        return None
    key = await db.api_keys.find_one({"key_hash": hash_key(plaintext), "revoked_at": None})
    if not key:
        return None
    if key.get("expires_at") and key["expires_at"] < now():
        return None
    last = key.get("last_used_at")
    if not last or (now() - last).total_seconds() > 60:
        await db.api_keys.update_one({"_id": key["_id"]}, {"$set": {"last_used_at": now()}})
    return key


async def get_api_key_context(
    authorization: str | None = Header(default=None),
    db: Database = Depends(get_db),
) -> Doc:
    token = _bearer(authorization)
    key = await resolve_api_key(db, token) if token else None
    if not key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key", headers={"WWW-Authenticate": "Bearer"})
    return key


def serialize_user(user: Doc) -> dict[str, Any]:
    return {"id": user["_id"], "email": user["email"], "display_name": user["display_name"]}


def serialize_key(key: Doc) -> dict[str, Any]:
    return {
        "id": key["_id"],
        "name": key["name"],
        "prefix": key["prefix"],
        "scope": key["scope"],
        "created_at": iso(key["created_at"]),
        "last_used_at": iso(key.get("last_used_at")),
        "expires_at": iso(key.get("expires_at")),
        "revoked_at": iso(key.get("revoked_at")),
    }
