"""How heavy a loadout is on the agent, 0 lean to 100 hopeless. Mirrors frontend/src/lib/overload.ts."""

from __future__ import annotations

import json
import re
from typing import Any

from .tool_view import Manifest


def schema_tokens(tools: list[dict[str, Any]], manifests: Manifest) -> int:
    chars = 0
    for t in tools:
        up = manifests.get(t["server_id"], {}).get(t["upstream_name"]) or {}
        desc = t.get("description_override")
        if desc is None:
            desc = up.get("description") or ""
        chars += len(t["alias"]) + len(desc) + len(json.dumps(up.get("inputSchema") or {}))
    return round(chars / 4)


def score(breakdown: dict[str, int], tool_count: int) -> int:
    token_part = min(60.0, breakdown["schema_tokens"] / 12000 * 60)
    unused_part = min(20.0, breakdown["unused_tools"] / tool_count * 30) if tool_count else 0.0
    dup_part = min(12.0, breakdown["duplicate_names"] * 4)
    avg = breakdown["avg_description_chars"]
    desc_part = 8 if avg < 40 else 6 if avg > 400 else 0
    return round(min(100.0, token_part + unused_part + dup_part + desc_part))


def compute(loadout: dict[str, Any], manifests: Manifest, used_aliases: set[str] | None) -> dict[str, Any]:
    """`used_aliases` is None when the loadout has never been called; then nothing counts as unused."""
    enabled = [t for t in loadout.get("tools", []) if t.get("enabled", True)]
    names = [re.sub(r"[^a-z]", "", t["alias"].lower()) for t in enabled]
    duplicates = len(names) - len(set(names))
    descs = []
    for t in enabled:
        d = t.get("description_override")
        if d is None:
            d = (manifests.get(t["server_id"], {}).get(t["upstream_name"]) or {}).get("description") or ""
        descs.append(len(d))
    avg = round(sum(descs) / len(descs)) if descs else 0
    unused = 0 if used_aliases is None else sum(1 for t in enabled if t["alias"] not in used_aliases)
    breakdown = {
        "schema_tokens": schema_tokens(enabled, manifests),
        "unused_tools": unused,
        "duplicate_names": duplicates,
        "avg_description_chars": avg,
    }
    return {"score": score(breakdown, len(enabled)), "breakdown": breakdown}
