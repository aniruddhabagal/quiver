from typing import Literal

from pydantic import Field

from .common import Schema


class KeyScope(Schema):
    type: Literal["account", "loadout"]
    loadout_id: str | None = None


class ApiKeyCreate(Schema):
    name: str = Field(min_length=1, max_length=80)
    scope: KeyScope = KeyScope(type="account")
    expires_in_days: int | None = Field(default=None, ge=1, le=3650)


class ApiKeyOut(Schema):
    id: str
    name: str
    prefix: str
    scope: KeyScope
    created_at: str
    last_used_at: str | None
    expires_at: str | None
    revoked_at: str | None


class ApiKeyCreated(ApiKeyOut):
    plaintext: str
