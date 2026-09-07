"""The one path every tools/call takes, whether it arrives over MCP or from the playground."""

from __future__ import annotations

from typing import Any

from ..config import settings
from ..db import Database
from ..utils.broadcaster import broadcaster
from ..utils.upstream import UpstreamError
from . import calls as calls_svc
from . import policy as policy_svc
from .redaction import compile_rules, redact_obj, redact_result
from .tool_view import outbound_arguments


class ToolNotFound(Exception):
    pass


def resolve_spec(loadout: dict[str, Any], alias: str) -> dict[str, Any]:
    for spec in loadout.get("tools", []):
        if spec.get("alias") == alias:
            return spec
    raise ToolNotFound(alias)


async def run_tool_call(
    *,
    db: Database,
    upstream: Any,
    rate_limiter: Any,
    holds: Any,
    loadout: dict[str, Any],
    servers: dict[str, dict[str, Any]],
    alias: str,
    arguments: dict[str, Any],
    agent: str,
    api_key: dict[str, Any] | None,
    session_id: str | None,
    source: str = "mcp",
) -> dict[str, Any]:
    """Returns an MCP CallToolResult-shaped dict. Raises ToolNotFound for an unknown alias."""
    spec = resolve_spec(loadout, alias)
    server = servers.get(spec["server_id"])
    rules = compile_rules((spec.get("policy") or {}).get("redact"))
    args_redacted = redact_obj(arguments, rules)
    trace: list[str] = [f"alias {alias} resolved to {server['name'] if server else '?'}/{spec['upstream_name']}"]

    call = await calls_svc.start_call(
        db,
        user_id=loadout["user_id"],
        loadout_id=loadout["_id"],
        loadout_slug=loadout["slug"],
        tool_id=spec["id"],
        alias=alias,
        server_id=spec["server_id"],
        server_name=server["name"] if server else "",
        upstream_name=spec["upstream_name"],
        agent=agent,
        api_key_id=api_key["_id"] if api_key else None,
        api_key_name=api_key["name"] if api_key else None,
        mcp_session_id=session_id,
        source=source,
        args_redacted=args_redacted,
    )
    await broadcaster.publish(
        loadout["user_id"],
        "call.started",
        {"call_id": call["_id"], "loadout_id": loadout["_id"], "alias": alias, "agent": agent, "source": source},
    )

    limit = (spec.get("policy") or {}).get("rate_limit_per_min")
    rate = rate_limiter.check_and_record((loadout["_id"], spec["id"]), limit) if limit else None
    trace.append(
        f"rate limit {limit}/min: {'exceeded' if rate and not rate.allowed else 'ok'}" if limit else "no rate limit"
    )
    decision = policy_svc.evaluate(spec, rate)
    trace.append(f"policy {decision.reason}")
    await broadcaster.publish(
        loadout["user_id"],
        "call.decision",
        {"call_id": call["_id"], "loadout_id": loadout["_id"], "action": decision.action, "reason": decision.reason},
    )

    async def finish(
        status: str, *, result: dict[str, Any] | None, error: str | None, is_error: bool, approval_id: str | None = None
    ) -> dict[str, Any]:
        preview, size = calls_svc.preview_of(result)
        done = await calls_svc.finish_call(
            db,
            call,
            status=status,
            result_preview=preview,
            result_size=size,
            is_error=is_error,
            error_message=error,
            approval_id=approval_id,
            policy_trace=trace,
        )
        await broadcaster.publish(
            loadout["user_id"],
            "call.finished",
            {
                "call_id": call["_id"],
                "loadout_id": loadout["_id"],
                "alias": alias,
                "status": status,
                "duration_ms": done["duration_ms"],
                "is_error": is_error,
            },
        )
        return done

    if decision.action == "deny":
        status = "rate_limited" if decision.reason == "rate_limited" else "denied"
        await finish(status, result=None, error=decision.message, is_error=True)
        return {"content": [{"type": "text", "text": decision.message}], "isError": True}

    approval_id: str | None = None
    if decision.action == "hold":
        outcome, approval_id, reason = await holds.hold(db, call, loadout, spec, args_redacted)
        if outcome != "approved":
            status = "held_denied" if outcome == "denied" else "expired"
            message = reason or (
                f"Quiver: approval for {alias} was denied"
                if outcome == "denied"
                else f"Quiver: approval for {alias} expired with no decision"
            )
            trace.append(f"approval {outcome}")
            await finish(status, result=None, error=message, is_error=True, approval_id=approval_id)
            return {"content": [{"type": "text", "text": message}], "isError": True}
        trace.append("approval approved")

    if server is None:
        message = f"Quiver: the server behind {alias} is no longer connected"
        await finish("error", result=None, error=message, is_error=True, approval_id=approval_id)
        return {"content": [{"type": "text", "text": message}], "isError": True}

    outbound, stripped = outbound_arguments(spec, arguments)
    if stripped:
        trace.append(f"hidden args stripped: {', '.join(stripped)}")
    if spec.get("presets"):
        trace.append(f"presets applied: {', '.join(spec['presets'])}")
    timeout = (
        (spec.get("policy") or {}).get("timeout_s")
        or (loadout.get("settings") or {}).get("default_timeout_s")
        or settings.upstream_call_timeout_default
    )

    try:
        upstream_result = await upstream.call_tool(server, spec["upstream_name"], outbound, timeout_s=float(timeout))
    except UpstreamError as err:
        message = f"Quiver: upstream {err.kind}: {err.message}"
        trace.append(f"upstream {err.kind}")
        await finish("error", result=None, error=message, is_error=True, approval_id=approval_id)
        return {"content": [{"type": "text", "text": message}], "isError": True}

    result = (
        upstream_result.model_dump(by_alias=True, exclude_none=True)
        if hasattr(upstream_result, "model_dump")
        else dict(upstream_result)
    )
    result.pop("_meta", None)
    if rules:
        result = redact_result(result, rules)
        trace.append("redaction applied to args and result")
    is_error = bool(result.get("isError"))
    status = "held_approved" if approval_id else ("error" if is_error else "ok")
    await finish(
        status,
        result=result,
        error=("upstream reported an error" if is_error else None),
        is_error=is_error,
        approval_id=approval_id,
    )
    return result
