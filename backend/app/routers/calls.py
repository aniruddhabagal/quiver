from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ..db import Database, get_db
from ..dependencies.auth import get_current_user
from ..services.calls import serialize_call

router = APIRouter(prefix="/calls", tags=["calls"])


def _filters(user: dict, loadout_id: str | None, status_: str | None, q: str | None) -> dict[str, Any]:
    f: dict[str, Any] = {"user_id": user["_id"], "status": {"$ne": "running"}}
    if loadout_id:
        f["loadout_id"] = loadout_id
    if status_:
        f["status"] = status_
    if q:
        f["$or"] = [{"alias": {"$regex": q, "$options": "i"}}, {"agent": {"$regex": q, "$options": "i"}}]
    return f


@router.get("")
async def list_calls(
    loadout_id: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    q: str | None = None,
    limit: int = Query(default=200, ge=1, le=500),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> list[dict]:
    docs = await db.calls.find(_filters(user, loadout_id, status_, q)).sort("started_at", -1).to_list(limit)
    return [serialize_call(c) for c in docs]


@router.get("/export")
async def export_calls(user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> JSONResponse:
    docs = await db.calls.find(_filters(user, None, None, None)).sort("started_at", -1).to_list(5000)
    return JSONResponse(
        [serialize_call(c) for c in docs],
        headers={"Content-Disposition": 'attachment; filename="quiver-calls.json"'},
    )


@router.get("/{call_id}")
async def get_call(call_id: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    c = await db.calls.find_one({"_id": call_id, "user_id": user["_id"]})
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found")
    return serialize_call(c)
