from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import Database, get_db
from ..dependencies.auth import get_current_user, hash_key, serialize_key
from ..schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyOut
from ..utils.ids import new_id, now, token

router = APIRouter(prefix="/keys", tags=["keys"])


@router.get("", response_model=list[ApiKeyOut])
async def list_keys(user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> list[ApiKeyOut]:
    docs = await db.api_keys.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(500)
    return [ApiKeyOut(**serialize_key(d)) for d in docs]


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_key(
    body: ApiKeyCreate, user: dict = Depends(get_current_user), db: Database = Depends(get_db)
) -> ApiKeyCreated:
    if body.scope.type == "loadout":
        if not body.scope.loadout_id:
            raise HTTPException(422, "loadout_id is required for a loadout key")
        if not await db.loadouts.find_one({"_id": body.scope.loadout_id, "user_id": user["_id"]}):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Loadout not found")
    plaintext = "qv_" + token(32)
    doc = {
        "_id": new_id("k"),
        "user_id": user["_id"],
        "name": body.name.strip(),
        "key_hash": hash_key(plaintext),
        "prefix": plaintext[:10],
        "scope": body.scope.model_dump(),
        "created_at": now(),
        "last_used_at": None,
        "expires_at": now() + timedelta(days=body.expires_in_days) if body.expires_in_days else None,
        "revoked_at": None,
    }
    await db.api_keys.insert_one(doc)
    return ApiKeyCreated(**serialize_key(doc), plaintext=plaintext)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(key_id: str, user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> None:
    res = await db.api_keys.update_one(
        {"_id": key_id, "user_id": user["_id"], "revoked_at": None}, {"$set": {"revoked_at": now()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Key not found")
