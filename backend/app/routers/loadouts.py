from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import Database, get_db
from ..dependencies.auth import get_current_user
from ..schemas.loadout import DiffOut, LoadoutCreate, LoadoutOut, LoadoutUpdate, SaveToolsIn, VersionOut
from ..services import overload, versions
from ..services.tool_view import build_tools, index_manifests
from ..utils.crypto import encrypt_json
from ..utils.ids import iso, new_id, now
from ..utils.slug import slugify

router = APIRouter(prefix="/loadouts", tags=["loadouts"])

DEFAULT_SETTINGS = {
    "approval_timeout_s": 120,
    "agent_header": "X-Agent-Name",
    "default_timeout_s": 60,
    "slack_webhook_enc": None,
}


async def find_loadout(db: Database, user_id: str, ref: str) -> dict[str, Any]:
    lo = await db.loadouts.find_one({"user_id": user_id, "$or": [{"_id": ref}, {"slug": ref}]})
    if not lo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Loadout not found")
    return lo


async def used_aliases(db: Database, loadout: dict[str, Any]) -> set[str] | None:
    """Aliases called in the last week, or None if the loadout has never been called at all."""
    if await db.calls.count_documents({"loadout_id": loadout["_id"]}, limit=1) == 0:
        return None
    since = now() - timedelta(days=7)
    aliases = await db.calls.distinct("alias", {"loadout_id": loadout["_id"], "started_at": {"$gte": since}})
    return set(aliases)


async def serialize_loadout(db: Database, lo: dict[str, Any]) -> dict[str, Any]:
    servers = await db.servers.find({"user_id": lo["user_id"]}).to_list(500)
    manifests = index_manifests(servers)
    settings = {**DEFAULT_SETTINGS, **(lo.get("settings") or {})}
    return {
        "id": lo["_id"],
        "name": lo["name"],
        "slug": lo["slug"],
        "description": lo.get("description", ""),
        "tools": lo.get("tools", []),
        "settings": {
            "approval_timeout_s": settings["approval_timeout_s"],
            "agent_header": settings["agent_header"],
            "default_timeout_s": settings["default_timeout_s"],
            "slack_webhook_configured": bool(settings.get("slack_webhook_enc")),
        },
        "published": bool(lo.get("published")),
        "current_version": lo.get("current_version", 0),
        "overload": overload.compute(lo, manifests, await used_aliases(db, lo)),
        "created_at": iso(lo["created_at"]),
        "updated_at": iso(lo.get("updated_at") or lo["created_at"]),
    }


def serialize_version(v: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": v["_id"],
        "loadout_id": v["loadout_id"],
        "version": v["version"],
        "summary": v["summary"],
        "note": v.get("note"),
        "created_at": iso(v["created_at"]),
    }


async def unique_slug(db: Database, name: str, exclude_id: str | None = None) -> str:
    base = slugify(name)
    slug = base
    n = 2
    while await db.loadouts.find_one({"slug": slug, **({"_id": {"$ne": exclude_id}} if exclude_id else {})}):
        slug = f"{base}-{n}"
        n += 1
    return slug


async def snapshot_for(db: Database, loadout_id: str, version: int) -> list[dict[str, Any]]:
    if version <= 0:
        return []
    v = await db.loadout_versions.find_one({"loadout_id": loadout_id, "version": version})
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Version {version} not found")
    return v["snapshot"]["tools"]


async def save_tools(db: Database, lo: dict[str, Any], tools: list[dict[str, Any]], note: str | None) -> dict[str, Any]:
    before = lo.get("tools", [])
    version = lo.get("current_version", 0) + 1
    await db.loadout_versions.insert_one(
        {
            "_id": new_id("v"),
            "loadout_id": lo["_id"],
            "version": version,
            "snapshot": {"tools": tools},
            "summary": versions.summary(before, tools),
            "note": note,
            "created_at": now(),
        }
    )
    update = {"tools": tools, "current_version": version, "updated_at": now()}
    await db.loadouts.update_one({"_id": lo["_id"]}, {"$set": update})
    return {**lo, **update}


@router.get("", response_model=list[LoadoutOut])
async def list_loadouts(user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[dict]:
    docs = await db.loadouts.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(500)
    return [await serialize_loadout(db, d) for d in docs]


@router.post("", response_model=LoadoutOut, status_code=status.HTTP_201_CREATED)
async def create_loadout(
    body: LoadoutCreate, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    doc = {
        "_id": new_id("lo"),
        "user_id": user["_id"],
        "name": body.name.strip(),
        "slug": await unique_slug(db, body.name),
        "description": body.description.strip(),
        "tools": [],
        "settings": dict(DEFAULT_SETTINGS),
        "published": False,
        "current_version": 0,
        "created_at": now(),
        "updated_at": now(),
    }
    await db.loadouts.insert_one(doc)
    return await serialize_loadout(db, doc)


@router.get("/{ref}", response_model=LoadoutOut)
async def get_loadout(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    return await serialize_loadout(db, await find_loadout(db, user["_id"], ref))


@router.patch("/{ref}", response_model=LoadoutOut)
async def update_loadout(
    ref: str, body: LoadoutUpdate, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    update: dict[str, Any] = {"updated_at": now()}
    if body.name is not None and body.name.strip() != lo["name"]:
        update["name"] = body.name.strip()
        update["slug"] = await unique_slug(db, body.name, exclude_id=lo["_id"])
    if body.description is not None:
        update["description"] = body.description.strip()
    if body.settings is not None:
        settings = {**DEFAULT_SETTINGS, **(lo.get("settings") or {})}
        s = body.settings
        if s.approval_timeout_s is not None:
            settings["approval_timeout_s"] = s.approval_timeout_s
        if s.agent_header is not None:
            settings["agent_header"] = s.agent_header
        if s.default_timeout_s is not None:
            settings["default_timeout_s"] = s.default_timeout_s
        if s.slack_webhook is not None:
            settings["slack_webhook_enc"] = encrypt_json({"url": s.slack_webhook}) if s.slack_webhook.strip() else None
        update["settings"] = settings
    await db.loadouts.update_one({"_id": lo["_id"]}, {"$set": update})
    return await serialize_loadout(db, {**lo, **update})


@router.delete("/{ref}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loadout(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> None:
    lo = await find_loadout(db, user["_id"], ref)
    await db.loadouts.delete_one({"_id": lo["_id"]})
    await db.loadout_versions.delete_many({"loadout_id": lo["_id"]})
    await db.api_keys.update_many(
        {"user_id": user["_id"], "scope.loadout_id": lo["_id"], "revoked_at": None}, {"$set": {"revoked_at": now()}}
    )


@router.put("/{ref}/tools", response_model=LoadoutOut)
async def put_tools(
    ref: str, body: SaveToolsIn, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    owned = {s["_id"] async for s in db.servers.find({"user_id": user["_id"]}, {"_id": 1})}
    unknown = sorted({t.server_id for t in body.tools} - owned)
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"unknown server ids: {', '.join(unknown)}")
    tools = [t.model_dump() for t in body.tools]
    return await serialize_loadout(db, await save_tools(db, lo, tools, body.note))


@router.post("/{ref}/publish", response_model=LoadoutOut)
async def publish(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    if not any(t.get("enabled", True) for t in lo.get("tools", [])):
        raise HTTPException(status.HTTP_409_CONFLICT, "Add at least one enabled tool before publishing")
    update = {"published": True, "updated_at": now()}
    await db.loadouts.update_one({"_id": lo["_id"]}, {"$set": update})
    return await serialize_loadout(db, {**lo, **update})


@router.post("/{ref}/unpublish", response_model=LoadoutOut)
async def unpublish(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    update = {"published": False, "updated_at": now()}
    await db.loadouts.update_one({"_id": lo["_id"]}, {"$set": update})
    return await serialize_loadout(db, {**lo, **update})


@router.get("/{ref}/versions", response_model=list[VersionOut])
async def list_versions(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[dict]:
    lo = await find_loadout(db, user["_id"], ref)
    docs = await db.loadout_versions.find({"loadout_id": lo["_id"]}).sort("version", -1).to_list(1000)
    return [serialize_version(v) for v in docs]


@router.post("/{ref}/versions/{version}/rollback", response_model=LoadoutOut)
async def rollback(
    ref: str, version: int, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    tools = await snapshot_for(db, lo["_id"], version)
    return await serialize_loadout(db, await save_tools(db, lo, tools, f"rollback to v{version}"))


@router.get("/{ref}/diff", response_model=DiffOut, response_model_by_alias=True)
async def diff(
    ref: str,
    from_version: int = Query(alias="from", ge=0),
    to_version: int = Query(alias="to", ge=0),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> dict:
    lo = await find_loadout(db, user["_id"], ref)
    before = await snapshot_for(db, lo["_id"], from_version)
    after = (
        lo.get("tools", [])
        if to_version == lo.get("current_version", 0)
        else await snapshot_for(db, lo["_id"], to_version)
    )
    return {"from": from_version, "to": to_version, **versions.detailed(before, after)}


@router.get("/{ref}/preview")
async def preview(ref: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[dict]:
    """Exactly what tools/list will return for this loadout."""
    lo = await find_loadout(db, user["_id"], ref)
    servers = await db.servers.find({"user_id": user["_id"]}).to_list(500)
    return build_tools(lo, index_manifests(servers))
