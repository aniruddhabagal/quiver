from fastapi import APIRouter, Depends, HTTPException, status

from ..db import Database, get_db
from ..dependencies.auth import get_current_user, serialize_user
from ..schemas.auth import LoginIn, RefreshIn, SignupIn, TokenPair, UserOut
from ..utils.ids import new_id, now
from ..utils.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _pair(user: dict) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user["_id"]),
        refresh_token=create_refresh_token(user["_id"]),
        user=UserOut(**serialize_user(user)),
    )


@router.post("/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupIn, db: Database = Depends(get_db)) -> TokenPair:
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    user = {
        "_id": new_id("u"),
        "email": email,
        "password_hash": hash_password(body.password),
        "display_name": body.display_name.strip(),
        "is_active": True,
        "created_at": now(),
    }
    await db.users.insert_one(user)
    return _pair(user)


@router.post("/login", response_model=TokenPair)
async def login(body: LoginIn, db: Database = Depends(get_db)) -> TokenPair:
    user = await db.users.find_one({"email": body.email.lower(), "is_active": True})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return _pair(user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, db: Database = Depends(get_db)) -> TokenPair:
    payload = decode_token(body.refresh_token, "refresh")
    user = await db.users.find_one({"_id": payload["sub"], "is_active": True}) if payload else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid or expired")
    return _pair(user)


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**serialize_user(user))
