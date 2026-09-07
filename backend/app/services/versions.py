"""Every save of a loadout's tools is a version. Diffs are computed from snapshots."""

from __future__ import annotations

import json
from typing import Any

Spec = dict[str, Any]


def _by_id(tools: list[Spec]) -> dict[str, Spec]:
    return {t["id"]: t for t in tools}


def _same(a: Spec, b: Spec) -> bool:
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(b, sort_keys=True, default=str)


def summary(before: list[Spec], after: list[Spec]) -> dict[str, list[str]]:
    a, b = _by_id(before), _by_id(after)
    return {
        "added": [t["alias"] for t in after if t["id"] not in a],
        "removed": [t["alias"] for t in before if t["id"] not in b],
        "changed": [t["alias"] for t in after if t["id"] in a and not _same(a[t["id"]], t)],
    }


def detailed(before: list[Spec], after: list[Spec]) -> dict[str, Any]:
    a, b = _by_id(before), _by_id(after)
    changed = []
    for t in after:
        old = a.get(t["id"])
        if old is None or _same(old, t):
            continue
        fields = sorted(k for k in set(old) | set(t) if not _same(old.get(k), t.get(k)))
        changed.append({"alias": t["alias"], "fields": fields})
    return {
        "added": [t for t in after if t["id"] not in a],
        "removed": [t for t in before if t["id"] not in b],
        "changed": changed,
    }
