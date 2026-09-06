from typing import Any, Literal

from pydantic import Field

from .common import Schema

Transport = Literal["auto", "streamable_http", "sse"]
AuthType = Literal["none", "bearer", "api_key_header", "basic"]


class ServerAuthIn(Schema):
    type: AuthType = "none"
    header_name: str | None = None
    value: str | None = None


class ServerCreate(Schema):
    name: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9-]*$")
    url: str = Field(min_length=8, max_length=2048)
    transport: Transport = "auto"
    auth: ServerAuthIn = ServerAuthIn()


class ServerUpdate(Schema):
    name: str | None = Field(default=None, min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9-]*$")
    url: str | None = Field(default=None, min_length=8, max_length=2048)
    transport: Transport | None = None
    auth: ServerAuthIn | None = None


class ServerAuthOut(Schema):
    type: AuthType
    header_name: str | None = None
    has_credentials: bool


class ManifestOut(Schema):
    tools: list[dict[str, Any]]
    fetched_at: str | None
    error: str | None


class ProbeOut(Schema):
    at: str | None
    latency_ms: int | None
    error: str | None


class ServerOut(Schema):
    id: str
    name: str
    url: str
    transport: Transport
    detected_transport: Literal["streamable_http", "sse"] | None
    auth: ServerAuthOut
    manifest: ManifestOut
    status: Literal["unknown", "healthy", "degraded", "down"]
    last_probe: ProbeOut
    created_at: str
    updated_at: str
