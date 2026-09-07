"""The virtual MCP server. One published loadout, one URL, JSON-RPC over POST."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse

from ..db import Database, get_db
from ..dependencies.auth import resolve_api_key
from ..schemas.mcp import (
    DEFAULT_PROTOCOL,
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    PREFERRED_PROTOCOL,
    SUPPORTED_PROTOCOLS,
    RpcMessage,
    rpc_error,
    rpc_result,
)
from ..services import mcp_sessions
from ..services.pipeline import ToolNotFound, run_tool_call
from ..services.tool_view import build_tools, index_manifests

router = APIRouter(tags=["mcp"])


def _http_error(status: int, message: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status, headers=headers)


async def _authenticate(
    request: Request, db: Database, slug: str
) -> tuple[dict[str, Any], dict[str, Any]] | JSONResponse:
    auth = request.headers.get("authorization", "")
    token = auth.split(" ", 1)[1].strip() if auth.lower().startswith("bearer ") else ""
    key = await resolve_api_key(db, token) if token else None
    if not key:
        return _http_error(
            401, "A Quiver API key is required: Authorization: Bearer qv_…", {"WWW-Authenticate": "Bearer"}
        )
    loadout = await db.loadouts.find_one({"slug": slug, "user_id": key["user_id"]})
    if not loadout:
        return _http_error(404, f"No loadout at /mcp/{slug}")
    scope = key.get("scope") or {}
    if scope.get("type") == "loadout" and scope.get("loadout_id") != loadout["_id"]:
        return _http_error(403, "This key is scoped to a different loadout")
    if not loadout.get("published"):
        return _http_error(403, "This loadout is not published")
    return key, loadout


@router.get("/mcp/{slug}")
async def mcp_get(slug: str) -> Response:
    return Response(status_code=405, headers={"Allow": "POST, DELETE"})


@router.delete("/mcp/{slug}")
async def mcp_delete(slug: str, request: Request, db: Database = Depends(get_db)) -> Response:
    auth = await _authenticate(request, db, slug)
    if isinstance(auth, JSONResponse):
        return auth
    _, loadout = auth
    sid = request.headers.get("mcp-session-id")
    if not sid:
        return _http_error(400, "Mcp-Session-Id header is required")
    if not await mcp_sessions.end_session(db, sid, loadout["_id"]):
        return _http_error(404, "Unknown session")
    return Response(status_code=200)


@router.post("/mcp/{slug}")
async def mcp_post(slug: str, request: Request, db: Database = Depends(get_db)) -> Response:
    if "application/json" not in request.headers.get("content-type", ""):
        return _http_error(415, "Content-Type must be application/json")
    accept = request.headers.get("accept", "*/*")
    if "application/json" not in accept and "*/*" not in accept:
        return _http_error(406, "Accept must include application/json")
    protocol = request.headers.get("mcp-protocol-version")
    if protocol and protocol not in SUPPORTED_PROTOCOLS:
        return _http_error(
            400, f"Unsupported MCP-Protocol-Version {protocol}; supported: {', '.join(SUPPORTED_PROTOCOLS)}"
        )
    protocol = protocol or DEFAULT_PROTOCOL

    auth = await _authenticate(request, db, slug)
    if isinstance(auth, JSONResponse):
        return auth
    key, loadout = auth

    try:
        payload = json.loads(await request.body() or b"")
    except (ValueError, UnicodeDecodeError):
        return JSONResponse(rpc_error(None, PARSE_ERROR, "Parse error"), status_code=400)

    is_batch = isinstance(payload, list)
    messages = [RpcMessage(m) for m in (payload if is_batch else [payload])]
    if not messages:
        return JSONResponse(rpc_error(None, INVALID_REQUEST, "Empty batch"), status_code=400)

    sid = request.headers.get("mcp-session-id")
    session: dict[str, Any] | None = None
    needs_session = any(m.method != "initialize" for m in messages if m.is_request or m.is_notification)
    if needs_session:
        if not sid:
            return _http_error(400, "Mcp-Session-Id header is required after initialize")
        session = await mcp_sessions.lookup_session(db, sid, loadout["_id"])
        if not session:
            return _http_error(404, "Unknown or ended session; initialize again")

    servers = {s["_id"]: s async for s in db.servers.find({"user_id": loadout["user_id"]})}
    manifests = index_manifests(list(servers.values()))
    app = request.app
    responses: list[dict[str, Any]] = []
    new_sid: str | None = None

    for m in messages:
        if m.is_response:
            continue
        if not (m.is_request or m.is_notification):
            responses.append(rpc_error(m.id if m.has_id else None, INVALID_REQUEST, "Invalid Request"))
            continue
        if m.is_notification:
            if m.method == "notifications/initialized" and sid:
                await mcp_sessions.mark_initialized(db, sid)
            continue

        method = m.method
        try:
            if method == "initialize":
                requested = m.params.get("protocolVersion")
                negotiated = requested if requested in SUPPORTED_PROTOCOLS else PREFERRED_PROTOCOL
                new_sid = await mcp_sessions.create_session(db, loadout, key, negotiated, m.params.get("clientInfo"))
                responses.append(
                    rpc_result(
                        m.id,
                        {
                            "protocolVersion": negotiated,
                            "capabilities": {"tools": {"listChanged": False}},
                            "serverInfo": {"name": "quiver", "title": loadout["name"], "version": "0.1.0"},
                            "instructions": loadout.get("description") or "",
                        },
                    )
                )
            elif method == "ping":
                responses.append(rpc_result(m.id, {}))
            elif method == "tools/list":
                responses.append(rpc_result(m.id, {"tools": build_tools(loadout, manifests)}))
            elif method == "tools/call":
                name = m.params.get("name")
                arguments = m.params.get("arguments", {})
                if not isinstance(name, str) or not name:
                    responses.append(rpc_error(m.id, INVALID_PARAMS, "params.name must be a string"))
                    continue
                if arguments is None:
                    arguments = {}
                if not isinstance(arguments, dict):
                    responses.append(rpc_error(m.id, INVALID_PARAMS, "params.arguments must be an object"))
                    continue
                agent_header = (loadout.get("settings") or {}).get("agent_header") or "X-Agent-Name"
                agent = request.headers.get(agent_header.lower()) or key["name"]
                try:
                    result = await run_tool_call(
                        db=db,
                        upstream=app.state.upstream,
                        rate_limiter=app.state.rate_limiter,
                        holds=app.state.holds,
                        loadout=loadout,
                        servers=servers,
                        alias=name,
                        arguments=arguments,
                        agent=agent,
                        api_key=key,
                        session_id=sid,
                    )
                except ToolNotFound:
                    responses.append(rpc_error(m.id, INVALID_PARAMS, f"Unknown tool: {name}"))
                    continue
                responses.append(rpc_result(m.id, result))
            else:
                responses.append(rpc_error(m.id, METHOD_NOT_FOUND, f"Method not found: {method}"))
        except Exception as exc:  # noqa: BLE001 - never leak a traceback to the agent
            responses.append(rpc_error(m.id, INTERNAL_ERROR, f"Internal error: {type(exc).__name__}"))

    headers = {"MCP-Protocol-Version": protocol}
    if new_sid or sid:
        headers["Mcp-Session-Id"] = new_sid or sid  # type: ignore[assignment]
    if not responses:
        return Response(status_code=202, headers=headers)
    return JSONResponse(responses if is_batch else responses[0], headers=headers)
