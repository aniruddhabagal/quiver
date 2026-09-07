import pytest

from app.services.policy import RateState, evaluate
from app.services.rate_limit import SlidingWindow
from app.services.redaction import compile_rules, redact_obj, redact_result

HDRS = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}


def rpc(method, id_=1, **params):
    msg = {"jsonrpc": "2.0", "method": method}
    if id_ is not None:
        msg["id"] = id_
    if params:
        msg["params"] = params
    return msg


@pytest.fixture
async def published(client, auth):
    """A user, a server with the fake manifest, a published loadout and a scoped key."""
    h = auth["headers"]
    sid = (
        await client.post("/api/v1/servers", json={"name": "docs", "url": "https://mcp.example.com/mcp"}, headers=h)
    ).json()["id"]
    lo = (await client.post("/api/v1/loadouts", json={"name": "ops", "description": "Read broadly."}, headers=h)).json()
    tools = [
        {
            "server_id": sid,
            "upstream_name": "search_docs",
            "alias": "search",
            "presets": {"limit": 5},
            "policy": {
                "mode": "allow",
                "rate_limit_per_min": 2,
                "redact": [{"pattern": "sk-[a-z0-9]+", "replacement": "[key]"}],
            },
        },
        {"server_id": sid, "upstream_name": "delete_page", "alias": "remove_page", "policy": {"mode": "deny"}},
        {
            "server_id": sid,
            "upstream_name": "delete_page",
            "alias": "delete_page",
            "hidden_args": ["force"],
            "policy": {"mode": "approve"},
        },
        {"server_id": sid, "upstream_name": "search_docs", "alias": "off", "enabled": False},
    ]
    assert (await client.put(f"/api/v1/loadouts/{lo['id']}/tools", json={"tools": tools}, headers=h)).status_code == 200
    assert (await client.post(f"/api/v1/loadouts/{lo['id']}/publish", headers=h)).status_code == 200
    key = (
        await client.post(
            "/api/v1/keys",
            json={"name": "release-bot", "scope": {"type": "loadout", "loadout_id": lo["id"]}},
            headers=h,
        )
    ).json()
    return {
        "h": h,
        "loadout": lo,
        "server_id": sid,
        "key": key["plaintext"],
        "mcp": {**HDRS, "Authorization": f"Bearer {key['plaintext']}"},
    }


async def init(client, p, protocol="2025-06-18"):
    r = await client.post(
        "/mcp/ops",
        json=rpc("initialize", protocolVersion=protocol, capabilities={}, clientInfo={"name": "t", "version": "0"}),
        headers=p["mcp"],
    )
    assert r.status_code == 200, r.text
    sid = r.headers["mcp-session-id"]
    n = await client.post(
        "/mcp/ops", json=rpc("notifications/initialized", id_=None), headers={**p["mcp"], "Mcp-Session-Id": sid}
    )
    assert n.status_code == 202 and n.content == b""
    return sid, r.json()


async def test_auth_and_publish_gates(client, auth, published):
    p = published
    assert (await client.post("/mcp/ops", json=rpc("ping"), headers=HDRS)).status_code == 401
    assert (await client.post("/mcp/nope", json=rpc("ping"), headers=p["mcp"])).status_code == 404

    other = (await client.post("/api/v1/loadouts", json={"name": "other"}, headers=p["h"])).json()
    other_key = (
        await client.post(
            "/api/v1/keys", json={"name": "k2", "scope": {"type": "loadout", "loadout_id": other["id"]}}, headers=p["h"]
        )
    ).json()["plaintext"]
    assert (
        await client.post("/mcp/ops", json=rpc("ping"), headers={**HDRS, "Authorization": f"Bearer {other_key}"})
    ).status_code == 403

    assert (await client.post(f"/api/v1/loadouts/{p['loadout']['id']}/unpublish", headers=p["h"])).status_code == 200
    assert (await client.post("/mcp/ops", json=rpc("initialize"), headers=p["mcp"])).status_code == 403

    assert (await client.get("/mcp/ops")).status_code == 405
    assert (
        await client.post("/mcp/ops", content="{}", headers={**p["mcp"], "Content-Type": "text/plain"})
    ).status_code == 415
    assert (
        await client.post("/mcp/ops", json=rpc("ping"), headers={**p["mcp"], "MCP-Protocol-Version": "1999-01-01"})
    ).status_code == 400


async def test_initialize_negotiates_and_sessions_are_required(client, published):
    p = published
    sid, body = await init(client, p, protocol="2025-11-25")
    assert body["result"]["protocolVersion"] == "2025-11-25"
    assert body["result"]["serverInfo"]["name"] == "quiver"
    assert body["result"]["instructions"] == "Read broadly."

    old = await client.post("/mcp/ops", json=rpc("initialize", protocolVersion="2024-01-01"), headers=p["mcp"])
    assert old.json()["result"]["protocolVersion"] == "2025-06-18"

    assert (await client.post("/mcp/ops", json=rpc("ping"), headers=p["mcp"])).status_code == 400
    assert (
        await client.post("/mcp/ops", json=rpc("ping"), headers={**p["mcp"], "Mcp-Session-Id": "nope"})
    ).status_code == 404
    ok = await client.post("/mcp/ops", json=rpc("ping"), headers={**p["mcp"], "Mcp-Session-Id": sid})
    assert ok.status_code == 200 and ok.json() == {"jsonrpc": "2.0", "id": 1, "result": {}}
    assert ok.headers["mcp-session-id"] == sid

    assert (await client.request("DELETE", "/mcp/ops", headers={**p["mcp"], "Mcp-Session-Id": sid})).status_code == 200
    assert (
        await client.post("/mcp/ops", json=rpc("ping"), headers={**p["mcp"], "Mcp-Session-Id": sid})
    ).status_code == 404


async def test_tools_list_is_the_curated_view(client, published):
    p = published
    sid, _ = await init(client, p)
    r = await client.post("/mcp/ops", json=rpc("tools/list", id_="abc"), headers={**p["mcp"], "Mcp-Session-Id": sid})
    body = r.json()
    assert body["id"] == "abc"
    tools = {t["name"]: t for t in body["result"]["tools"]}
    assert set(tools) == {"search", "remove_page", "delete_page"}  # disabled tool is hidden, denied tool stays visible
    assert "limit" not in tools["search"]["inputSchema"]["properties"]  # preset removed
    assert "force" not in tools["delete_page"]["inputSchema"]["properties"]  # hidden removed
    assert tools["delete_page"]["inputSchema"]["required"] == ["id"]


async def test_tools_call_allow_deny_rate_limit_and_redaction(client, published, upstream, auth):
    p = published
    sid, _ = await init(client, p)
    h = {**p["mcp"], "Mcp-Session-Id": sid, "X-Agent-Name": "triage"}
    upstream.result_text = "found sk-abcdef in the docs"

    ok = await client.post(
        "/mcp/ops", json=rpc("tools/call", name="search", arguments={"q": "sk-secret123"}), headers=h
    )
    res = ok.json()["result"]
    assert res["isError"] is False
    assert res["content"][0]["text"] == "found [key] in the docs"  # result redacted on the way back
    assert upstream.calls[-1] == (
        "search_docs",
        {"q": "sk-secret123", "limit": 5},
    )  # upstream got the raw arg plus the preset

    denied = (
        await client.post("/mcp/ops", json=rpc("tools/call", name="remove_page", arguments={"id": "1"}), headers=h)
    ).json()["result"]
    assert denied["isError"] is True and "denied by policy" in denied["content"][0]["text"]

    held = (
        await client.post(
            "/mcp/ops", json=rpc("tools/call", name="delete_page", arguments={"id": "1", "force": True}), headers=h
        )
    ).json()["result"]
    assert held["isError"] is True and "approval" in held["content"][0]["text"]

    second = (
        await client.post("/mcp/ops", json=rpc("tools/call", name="search", arguments={"q": "b"}), headers=h)
    ).json()["result"]
    assert second["isError"] is False
    third = (
        await client.post("/mcp/ops", json=rpc("tools/call", name="search", arguments={"q": "c"}), headers=h)
    ).json()["result"]
    assert third["isError"] is True and "rate limit of 2" in third["content"][0]["text"]

    unknown = (await client.post("/mcp/ops", json=rpc("tools/call", name="nope", arguments={}), headers=h)).json()
    assert unknown["error"]["code"] == -32602
    bad_args = (await client.post("/mcp/ops", json=rpc("tools/call", name="search", arguments="x"), headers=h)).json()
    assert bad_args["error"]["code"] == -32602
    nomethod = (await client.post("/mcp/ops", json=rpc("resources/list"), headers=h)).json()
    assert nomethod["error"]["code"] == -32601
    parse = await client.post("/mcp/ops", content="{not json", headers=h)
    assert parse.status_code == 400 and parse.json()["error"]["code"] == -32700

    calls = (await client.get("/api/v1/calls", headers=auth["headers"])).json()
    statuses = [c["status"] for c in calls]
    assert (
        statuses.count("ok") == 2 and "denied" in statuses and "rate_limited" in statuses and "held_denied" in statuses
    )
    first_ok = next(c for c in calls if c["status"] == "ok" and c["args_redacted"].get("q") == "[key]")
    assert first_ok["agent"] == "triage" and first_ok["api_key_name"] == "release-bot"
    assert "redaction applied" in " ".join(first_ok["policy_trace"])
    assert first_ok["result_preview"] == "found [key] in the docs"
    detail = await client.get(f"/api/v1/calls/{first_ok['id']}", headers=auth["headers"])
    assert detail.status_code == 200
    export = await client.get("/api/v1/calls/export", headers=auth["headers"])
    assert export.status_code == 200 and len(export.json()) == len(calls)


async def test_batch_and_stray_responses(client, published):
    p = published
    sid, _ = await init(client, p)
    h = {**p["mcp"], "Mcp-Session-Id": sid}
    r = await client.post(
        "/mcp/ops",
        json=[
            rpc("ping", id_=1),
            rpc("tools/list", id_=2),
            {"jsonrpc": "2.0", "id": 9, "result": {}},
            rpc("notifications/progress", id_=None),
        ],
        headers=h,
    )
    body = r.json()
    assert isinstance(body, list) and [m["id"] for m in body] == [1, 2]
    only_notifications = await client.post("/mcp/ops", json=[rpc("notifications/progress", id_=None)], headers=h)
    assert only_notifications.status_code == 202


def test_policy_and_rate_limit_units():
    spec = {"alias": "x", "enabled": True, "policy": {"mode": "approve", "rate_limit_per_min": 1}}
    assert (
        evaluate(spec, RateState(False, 30)).reason == "rate_limited"
    )  # limits beat approvals so the inbox is not spammed
    assert evaluate(spec, RateState(True, 0)).action == "hold"
    assert evaluate({**spec, "enabled": False}, None).reason == "disabled"
    assert evaluate({"alias": "x", "policy": {"mode": "deny"}}, None).action == "deny"

    t = [0.0]
    w = SlidingWindow(clock=lambda: t[0])
    assert w.check_and_record(("l", "t"), 2).allowed and w.check_and_record(("l", "t"), 2).allowed
    blocked = w.check_and_record(("l", "t"), 2)
    assert not blocked.allowed and blocked.retry_after_s == 60
    t[0] = 61
    assert w.check_and_record(("l", "t"), 2).allowed
    assert w.check_and_record(("l", "t"), None).allowed


def test_redaction_units():
    rules = compile_rules([{"pattern": "ghp_[A-Za-z0-9]+", "replacement": "••••"}, {"pattern": "(unclosed"}])
    assert len(rules) == 1
    assert redact_obj({"token": "ghp_abc", "nested": ["ghp_x", 1]}, rules) == {"token": "••••", "nested": ["••••", 1]}
    r = redact_result(
        {
            "content": [{"type": "text", "text": "ghp_abc"}, {"type": "image", "data": "x"}],
            "structuredContent": {"t": "ghp_z"},
        },
        rules,
    )
    assert (
        r["content"][0]["text"] == "••••" and r["content"][1]["data"] == "x" and r["structuredContent"] == {"t": "••••"}
    )
