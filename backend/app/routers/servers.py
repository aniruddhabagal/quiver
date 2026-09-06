from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..db import Database, get_db
from ..dependencies.auth import get_current_user
from ..schemas.server import ServerCreate, ServerOut, ServerUpdate
from ..services.health_probe import probe_server
from ..services.manifest import refresh_manifest
from ..utils.crypto import encrypt_json
from ..utils.ids import iso, new_id, now

router = APIRouter(prefix="/servers", tags=["servers"])


def serialize_server(s: dict[str, Any]) -> dict[str, Any]:
    auth = s.get("auth") or {}
    manifest = s.get("manifest") or {}
    probe = s.get("last_probe") or {}
    return {
        "id": s["_id"],
        "name": s["name"],
        "url": s["url"],
        "transport": s.get("transport", "auto"),
        "detected_transport": s.get("detected_transport"),
        "auth": {
            "type": auth.get("type", "none"),
            "header_name": auth.get("header_name"),
            "has_credentials": bool(auth.get("enc")),
        },
        "manifest": {
            "tools": manifest.get("tools", []),
            "fetched_at": iso(manifest.get("fetched_at")),
            "error": manifest.get("error"),
        },
        "status": s.get("status", "unknown"),
        "last_probe": {"at": iso(probe.get("at")), "latency_ms": probe.get("latency_ms"), "error": probe.get("error")},
        "created_at": iso(s["created_at"]),
        "updated_at": iso(s.get("updated_at") or s["created_at"]),
    }


async def _owned(db: Database, user: dict, server_id: str) -> dict[str, Any]:
    server = await db.servers.find_one({"_id": server_id, "user_id": user["_id"]})
    if not server:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Server not found")
    return server


def _auth_doc(auth_in) -> dict[str, Any]:
    doc: dict[str, Any] = {"type": auth_in.type, "header_name": auth_in.header_name, "enc": None}
    if auth_in.type != "none" and auth_in.value:
        doc["enc"] = encrypt_json({"value": auth_in.value})
    return doc


@router.get("", response_model=list[ServerOut])
async def list_servers(user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[dict]:
    docs = await db.servers.find({"user_id": user["_id"]}).sort("created_at", 1).to_list(500)
    return [serialize_server(d) for d in docs]


@router.post("", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
async def create_server(
    body: ServerCreate, request: Request, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    if await db.servers.find_one({"user_id": user["_id"], "name": body.name}):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have a server with that name")
    doc = {
        "_id": new_id("srv"),
        "user_id": user["_id"],
        "name": body.name,
        "url": body.url,
        "transport": body.transport,
        "detected_transport": None,
        "auth": _auth_doc(body.auth),
        "manifest": {"tools": [], "server_info": None, "protocol_version": None, "fetched_at": None, "error": None},
        "status": "unknown",
        "last_probe": {"at": None, "latency_ms": None, "error": None},
        "created_at": now(),
        "updated_at": now(),
    }
    await db.servers.insert_one(doc)
    # fetch the manifest right away; a failure is recorded, not raised
    doc = await refresh_manifest(db, request.app.state.upstream, doc)
    return serialize_server(doc)


@router.get("/{server_id}", response_model=ServerOut)
async def get_server(server_id: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    return serialize_server(await _owned(db, user, server_id))


@router.patch("/{server_id}", response_model=ServerOut)
async def update_server(
    server_id: str, body: ServerUpdate, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    server = await _owned(db, user, server_id)
    update: dict[str, Any] = {"updated_at": now()}
    if body.name is not None:
        update["name"] = body.name
    if body.url is not None:
        update["url"] = body.url
        update["detected_transport"] = None
    if body.transport is not None:
        update["transport"] = body.transport
        update["detected_transport"] = None
    if body.auth is not None:
        # keep the stored secret when the caller only changes the type or header
        update["auth"] = (
            _auth_doc(body.auth)
            if body.auth.value
            else {**_auth_doc(body.auth), "enc": (server.get("auth") or {}).get("enc")}
        )
    await db.servers.update_one({"_id": server_id}, {"$set": update})
    return serialize_server({**server, **update})


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> None:
    await _owned(db, user, server_id)
    await db.servers.delete_one({"_id": server_id})


@router.post("/{server_id}/refresh-manifest", response_model=ServerOut)
async def refresh(
    server_id: str, request: Request, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    server = await _owned(db, user, server_id)
    return serialize_server(await refresh_manifest(db, request.app.state.upstream, server))


@router.post("/{server_id}/probe", response_model=ServerOut)
async def probe(
    server_id: str, request: Request, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    server = await _owned(db, user, server_id)
    return serialize_server(await probe_server(db, request.app.state.upstream, server))


@router.get("/{server_id}/tools")
async def tools(server_id: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[dict]:
    server = await _owned(db, user, server_id)
    return (server.get("manifest") or {}).get("tools", [])
