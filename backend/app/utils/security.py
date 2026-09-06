from datetime import timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from ..config import settings
from .ids import now, token

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    exp = now() + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "type": "access", "exp": exp}, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    exp = now() + timedelta(days=settings.refresh_token_days)
    return jwt.encode(
        {"sub": user_id, "type": "refresh", "exp": exp, "jti": token(16)}, settings.secret_key, algorithm=ALGORITHM
    )


def decode_token(value: str, expected_type: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(value, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != expected_type or not payload.get("sub"):
        return None
    return payload
