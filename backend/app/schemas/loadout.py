from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator

from ..utils.ids import new_id
from .common import Schema

ALIAS_RE = r"^[A-Za-z0-9_-]{1,64}$"
PolicyMode = Literal["allow", "approve", "deny"]


class RedactRule(Schema):
    pattern: str = Field(min_length=1, max_length=512)
    replacement: str = Field(default="••••", max_length=64)

    @field_validator("pattern")
    @classmethod
    def compiles(cls, v: str) -> str:
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f"invalid regular expression: {e}") from e
        return v


class Policy(Schema):
    mode: PolicyMode = "allow"
    rate_limit_per_min: int | None = Field(default=None, ge=1, le=100_000)
    redact: list[RedactRule] = Field(default_factory=list)
    timeout_s: int | None = Field(default=None, ge=1, le=600)


class ToolSpec(Schema):
    id: str = Field(default_factory=lambda: new_id("t"))
    server_id: str
    upstream_name: str = Field(min_length=1, max_length=256)
    alias: str = Field(pattern=ALIAS_RE)
    description_override: str | None = Field(default=None, max_length=4000)
    presets: dict[str, Any] = Field(default_factory=dict)
    hidden_args: list[str] = Field(default_factory=list)
    policy: Policy = Field(default_factory=Policy)
    enabled: bool = True

    @model_validator(mode="after")
    def presets_and_hidden_disjoint(self) -> ToolSpec:
        clash = set(self.presets) & set(self.hidden_args)
        if clash:
            raise ValueError(f"arguments cannot be both preset and hidden: {', '.join(sorted(clash))}")
        return self


class SaveToolsIn(Schema):
    tools: list[ToolSpec] = Field(max_length=200)
    note: str | None = Field(default=None, max_length=280)

    @field_validator("tools")
    @classmethod
    def unique_aliases(cls, tools: list[ToolSpec]) -> list[ToolSpec]:
        seen: set[str] = set()
        for t in tools:
            if t.alias in seen:
                raise ValueError(f"duplicate alias: {t.alias}")
            seen.add(t.alias)
        ids = [t.id for t in tools]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate tool ids")
        return tools


class SettingsIn(Schema):
    approval_timeout_s: int | None = Field(default=None, ge=15, le=600)
    agent_header: str | None = Field(default=None, min_length=1, max_length=64, pattern=r"^[A-Za-z0-9-]+$")
    default_timeout_s: int | None = Field(default=None, ge=1, le=600)
    slack_webhook: str | None = Field(default=None, max_length=512)


class LoadoutCreate(Schema):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=2000)


class LoadoutUpdate(Schema):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=2000)
    settings: SettingsIn | None = None


class SettingsOut(Schema):
    approval_timeout_s: int
    agent_header: str
    default_timeout_s: int
    slack_webhook_configured: bool


class OverloadOut(Schema):
    score: int
    breakdown: dict[str, int]


class LoadoutOut(Schema):
    id: str
    name: str
    slug: str
    description: str
    tools: list[ToolSpec]
    settings: SettingsOut
    published: bool
    current_version: int
    overload: OverloadOut
    created_at: str
    updated_at: str


class VersionOut(Schema):
    id: str
    loadout_id: str
    version: int
    summary: dict[str, list[str]]
    note: str | None
    created_at: str


class ChangedOut(Schema):
    alias: str
    fields: list[str]


class DiffOut(Schema):
    from_version: int = Field(alias="from")
    to_version: int = Field(alias="to")
    added: list[ToolSpec]
    removed: list[ToolSpec]
    changed: list[ChangedOut]
