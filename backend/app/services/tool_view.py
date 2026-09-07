"""What the agent sees. Pure functions, mirrored by frontend/src/lib/tool-view.ts."""

from __future__ import annotations

import copy
from typing import Any

Manifest = dict[str, dict[str, Any]]  # server_id -> {upstream_name -> tool}


def index_manifests(servers: list[dict[str, Any]]) -> Manifest:
    out: Manifest = {}
    for s in servers:
        tools = (s.get("manifest") or {}).get("tools", [])
        out[s["_id"]] = {t["name"]: t for t in tools}
    return out


def exposed_schema(spec: dict[str, Any], upstream: dict[str, Any] | None) -> dict[str, Any]:
    """Upstream inputSchema minus presets and hidden arguments, with `required` fixed."""
    schema = copy.deepcopy((upstream or {}).get("inputSchema") or {"type": "object", "properties": {}})
    schema["type"] = "object"
    props = schema.get("properties")
    if not isinstance(props, dict):
        props = {}
    schema["properties"] = props
    removed = set(spec.get("presets") or {}) | set(spec.get("hidden_args") or [])
    for key in removed:
        props.pop(key, None)
    required = schema.get("required")
    if isinstance(required, list):
        kept = [r for r in required if r not in removed]
        if kept:
            schema["required"] = kept
        else:
            schema.pop("required", None)
    return schema


def exposed_tool(spec: dict[str, Any], upstream: dict[str, Any] | None) -> dict[str, Any]:
    description = spec.get("description_override")
    if description is None:
        description = (upstream or {}).get("description") or ""
    tool: dict[str, Any] = {
        "name": spec["alias"],
        "description": description,
        "inputSchema": exposed_schema(spec, upstream),
    }
    if upstream and upstream.get("outputSchema"):
        tool["outputSchema"] = upstream["outputSchema"]
    return tool


def build_tools(loadout: dict[str, Any], manifests: Manifest) -> list[dict[str, Any]]:
    """tools/list for a loadout: enabled specs whose upstream still exists, in spec order."""
    out: list[dict[str, Any]] = []
    for spec in loadout.get("tools", []):
        if not spec.get("enabled", True):
            continue
        upstream = manifests.get(spec["server_id"], {}).get(spec["upstream_name"])
        if upstream is None:
            continue
        out.append(exposed_tool(spec, upstream))
    return out


def outbound_arguments(spec: dict[str, Any], incoming: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Strip hidden arguments the agent sent anyway, then let presets win."""
    hidden = set(spec.get("hidden_args") or [])
    stripped = [k for k in incoming if k in hidden]
    args = {k: v for k, v in incoming.items() if k not in hidden}
    args.update(spec.get("presets") or {})
    return args, stripped
