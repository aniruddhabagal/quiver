"""JSON-RPC 2.0 plumbing for the virtual MCP server."""

from __future__ import annotations

from typing import Any

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

SUPPORTED_PROTOCOLS = ("2025-11-25", "2025-06-18", "2025-03-26")
DEFAULT_PROTOCOL = "2025-03-26"
PREFERRED_PROTOCOL = "2025-06-18"


def rpc_result(id_: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": id_, "result": result}


def rpc_error(id_: Any, code: int, message: str, data: Any = None) -> dict[str, Any]:
    err: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": id_, "error": err}


def tool_error(text: str) -> dict[str, Any]:
    """A tool *result* carrying an error, so the agent learns why instead of crashing."""
    return {"content": [{"type": "text", "text": text}], "isError": True}


class RpcMessage:
    """One parsed JSON-RPC message with its classification."""

    def __init__(self, raw: Any):
        self.raw = raw
        self.valid = isinstance(raw, dict) and raw.get("jsonrpc") == "2.0"
        self.method: str | None = raw.get("method") if isinstance(raw, dict) else None
        self.has_id = isinstance(raw, dict) and "id" in raw
        self.id = raw.get("id") if isinstance(raw, dict) else None
        self.params: dict[str, Any] = raw.get("params") or {} if isinstance(raw, dict) else {}

    @property
    def is_request(self) -> bool:
        return self.valid and isinstance(self.method, str) and self.has_id and self.id is not None

    @property
    def is_notification(self) -> bool:
        return self.valid and isinstance(self.method, str) and not self.has_id

    @property
    def is_response(self) -> bool:
        return self.valid and self.method is None and ("result" in self.raw or "error" in self.raw)
