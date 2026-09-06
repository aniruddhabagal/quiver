from __future__ import annotations

from typing import Any

from mcp.types import CallToolResult, TextContent

from app.utils.upstream import ManifestResult, UpstreamError

DEFAULT_TOOLS = [
    {
        "name": "search_docs",
        "description": "Search the docs",
        "inputSchema": {
            "type": "object",
            "properties": {"q": {"type": "string"}, "limit": {"type": "integer"}},
            "required": ["q"],
        },
    },
    {
        "name": "delete_page",
        "description": "Delete a page",
        "inputSchema": {
            "type": "object",
            "properties": {"id": {"type": "string"}, "force": {"type": "boolean"}},
            "required": ["id"],
        },
    },
]


class FakeUpstreamClient:
    """Stands in for the SDK client. Records what it was asked to do."""

    def __init__(self, tools: list[dict[str, Any]] | None = None):
        self.tools = tools if tools is not None else DEFAULT_TOOLS
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.fail_with: UpstreamError | None = None
        self.result_text = '{"ok": true}'

    async def list_tools(self, server: dict[str, Any], timeout_s: float = 20) -> ManifestResult:
        if self.fail_with:
            raise self.fail_with
        return ManifestResult(
            tools=self.tools,
            server_info={"name": "fake"},
            protocol_version="2025-06-18",
            transport="streamable_http",
            latency_ms=12,
        )

    async def call_tool(
        self, server: dict[str, Any], name: str, arguments: dict[str, Any], timeout_s: float
    ) -> CallToolResult:
        if self.fail_with:
            raise self.fail_with
        self.calls.append((name, arguments))
        return CallToolResult(content=[TextContent(type="text", text=self.result_text)], isError=False)
