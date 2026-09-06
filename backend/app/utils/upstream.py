"""Talking to upstream MCP servers through the official SDK client.

One session per call in v1: open the transport, initialise, do the one thing,
close. Pooled per-server sessions are a later optimisation and need a
per-server actor task because SDK transports must be entered and exited from
the same task.
"""

from __future__ import annotations

import base64
from contextlib import AsyncExitStack
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Literal

import httpx
from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.shared.exceptions import McpError
from mcp.types import CallToolResult, Implementation

from ..config import settings
from .crypto import decrypt_json

TransportName = Literal["streamable_http", "sse"]


class UpstreamError(Exception):
    def __init__(self, kind: Literal["unreachable", "timeout", "protocol", "rpc"], message: str):
        super().__init__(message)
        self.kind = kind
        self.message = message


@dataclass
class ManifestResult:
    tools: list[dict[str, Any]]
    server_info: dict[str, Any] | None
    protocol_version: str | None
    transport: TransportName
    latency_ms: int


def build_auth_headers(server: dict[str, Any]) -> dict[str, str]:
    auth = server.get("auth") or {}
    creds = decrypt_json(auth.get("enc")) or {}
    kind = auth.get("type", "none")
    value = creds.get("value")
    if not value or kind == "none":
        return {}
    if kind == "bearer":
        return {"Authorization": f"Bearer {value}"}
    if kind == "api_key_header":
        return {auth.get("header_name") or "X-API-Key": value}
    if kind == "basic":
        return {"Authorization": "Basic " + base64.b64encode(value.encode()).decode()}
    return {}


def _leaf(exc: BaseException) -> BaseException:
    """anyio wraps failures inside the SDK in ExceptionGroups; find the real one."""
    while isinstance(exc, BaseExceptionGroup) and exc.exceptions:
        exc = exc.exceptions[0]
    return exc


def _normalise(exc: BaseException) -> UpstreamError:
    leaf = _leaf(exc)
    if isinstance(leaf, UpstreamError):
        return leaf
    if isinstance(leaf, httpx.TimeoutException):
        return UpstreamError("timeout", f"upstream timed out: {leaf}")
    if isinstance(leaf, httpx.ConnectError | httpx.NetworkError):
        return UpstreamError("unreachable", f"upstream unreachable: {leaf}")
    if isinstance(leaf, httpx.HTTPStatusError):
        return UpstreamError("protocol", f"upstream returned HTTP {leaf.response.status_code}")
    if isinstance(leaf, McpError):
        return UpstreamError("rpc", f"upstream error: {leaf.error.message}")
    return UpstreamError("protocol", f"upstream failed: {type(leaf).__name__}: {leaf}")


def _looks_like_wrong_transport(err: UpstreamError) -> bool:
    return err.kind == "protocol"


class UpstreamClient:
    """Real client. Tests inject a fake with the same two methods."""

    async def _open(self, stack: AsyncExitStack, server: dict[str, Any], transport: TransportName, read_timeout: float):
        headers = build_auth_headers(server)
        connect = settings.upstream_connect_timeout_s
        if transport == "streamable_http":
            read, write, _ = await stack.enter_async_context(
                streamablehttp_client(server["url"], headers=headers, timeout=connect, sse_read_timeout=read_timeout)
            )
        else:
            read, write = await stack.enter_async_context(
                sse_client(server["url"], headers=headers, timeout=connect, sse_read_timeout=read_timeout)
            )
        session = await stack.enter_async_context(
            ClientSession(
                read,
                write,
                read_timeout_seconds=timedelta(seconds=read_timeout),
                client_info=Implementation(name="quiver", version="0.1.0"),
            )
        )
        init = await session.initialize()
        return session, init

    def _candidates(self, server: dict[str, Any]) -> list[TransportName]:
        t = server.get("transport", "auto")
        if t in ("streamable_http", "sse"):
            return [t]
        detected = server.get("detected_transport")
        if detected in ("streamable_http", "sse"):
            other: TransportName = "sse" if detected == "streamable_http" else "streamable_http"
            return [detected, other]
        return ["streamable_http", "sse"]

    async def list_tools(self, server: dict[str, Any], timeout_s: float = 20) -> ManifestResult:
        import time

        last: UpstreamError | None = None
        for transport in self._candidates(server):
            started = time.monotonic()
            try:
                async with AsyncExitStack() as stack:
                    session, init = await self._open(stack, server, transport, timeout_s)
                    result = await session.list_tools()
                    return ManifestResult(
                        tools=[t.model_dump(by_alias=True, exclude_none=True) for t in result.tools],
                        server_info=init.serverInfo.model_dump(exclude_none=True) if init.serverInfo else None,
                        protocol_version=init.protocolVersion,
                        transport=transport,
                        latency_ms=int((time.monotonic() - started) * 1000),
                    )
            except BaseException as exc:  # noqa: BLE001 - normalised below
                last = _normalise(exc)
                if not _looks_like_wrong_transport(last):
                    break
        raise last or UpstreamError("protocol", "no transport worked")

    async def call_tool(
        self, server: dict[str, Any], name: str, arguments: dict[str, Any], timeout_s: float
    ) -> CallToolResult:
        transport = server.get("detected_transport") or self._candidates(server)[0]
        try:
            async with AsyncExitStack() as stack:
                session, _ = await self._open(stack, server, transport, timeout_s)
                return await session.call_tool(name, arguments, read_timeout_seconds=timedelta(seconds=timeout_s))
        except BaseException as exc:  # noqa: BLE001
            raise _normalise(exc) from exc
