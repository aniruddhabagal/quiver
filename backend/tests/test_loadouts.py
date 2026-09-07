async def make_server(client, auth):
    r = await client.post(
        "/api/v1/servers", json={"name": "docs", "url": "https://mcp.example.com/mcp"}, headers=auth["headers"]
    )
    assert r.status_code == 201
    return r.json()["id"]


def tool(server_id, name, alias, **over):
    return {"server_id": server_id, "upstream_name": name, "alias": alias, **over}


async def test_loadout_lifecycle_with_versions_diff_and_rollback(client, auth):
    h = auth["headers"]
    sid = await make_server(client, auth)

    r = await client.post("/api/v1/loadouts", json={"name": "Ops Agent", "description": "Release helper"}, headers=h)
    assert r.status_code == 201
    lo = r.json()
    assert lo["slug"] == "ops-agent" and lo["current_version"] == 0 and lo["published"] is False
    dup = await client.post("/api/v1/loadouts", json={"name": "Ops Agent"}, headers=h)
    assert dup.json()["slug"] == "ops-agent-2"

    # publishing an empty loadout is refused
    assert (await client.post(f"/api/v1/loadouts/{lo['id']}/publish", headers=h)).status_code == 409

    v1 = await client.put(
        f"/api/v1/loadouts/{lo['id']}/tools",
        json={
            "tools": [
                tool(sid, "search_docs", "search", policy={"mode": "allow", "rate_limit_per_min": 60}),
                tool(sid, "delete_page", "delete_page", policy={"mode": "approve"}),
            ]
        },
        headers=h,
    )
    assert v1.status_code == 200, v1.text
    body = v1.json()
    assert body["current_version"] == 1 and len(body["tools"]) == 2
    assert body["tools"][0]["id"].startswith("t_")
    assert body["overload"]["score"] >= 0

    # change one, drop one, add one: the version summary says so
    t_search = body["tools"][0]
    v2 = await client.put(
        f"/api/v1/loadouts/{lo['id']}/tools",
        json={
            "tools": [
                {**t_search, "description_override": "Search only the public docs.", "presets": {"limit": 5}},
                tool(sid, "delete_page", "remove_page"),
            ]
        },
        headers=h,
    )
    assert v2.status_code == 200
    versions = (await client.get(f"/api/v1/loadouts/{lo['id']}/versions", headers=h)).json()
    assert [v["version"] for v in versions] == [2, 1]
    assert versions[0]["summary"] == {"added": ["remove_page"], "removed": ["delete_page"], "changed": ["search"]}

    diff = (await client.get(f"/api/v1/loadouts/{lo['id']}/diff", params={"from": 1, "to": 2}, headers=h)).json()
    assert diff["from"] == 1 and diff["to"] == 2
    assert [c["alias"] for c in diff["changed"]] == ["search"]
    assert set(diff["changed"][0]["fields"]) == {"description_override", "presets"}

    preview = (await client.get(f"/api/v1/loadouts/{lo['id']}/preview", headers=h)).json()
    names = {t["name"]: t for t in preview}
    assert set(names) == {"search", "remove_page"}
    assert "limit" not in names["search"]["inputSchema"]["properties"]
    assert names["search"]["description"] == "Search only the public docs."

    rolled = await client.post(f"/api/v1/loadouts/{lo['id']}/versions/1/rollback", headers=h)
    assert rolled.status_code == 200
    assert rolled.json()["current_version"] == 3
    assert {t["alias"] for t in rolled.json()["tools"]} == {"search", "delete_page"}

    pub = await client.post(f"/api/v1/loadouts/{lo['id']}/publish", headers=h)
    assert pub.json()["published"] is True
    by_slug = await client.get("/api/v1/loadouts/ops-agent", headers=h)
    assert by_slug.status_code == 200 and by_slug.json()["id"] == lo["id"]


async def test_tool_validation(client, auth):
    h = auth["headers"]
    sid = await make_server(client, auth)
    lo = (await client.post("/api/v1/loadouts", json={"name": "Strict"}, headers=h)).json()
    url = f"/api/v1/loadouts/{lo['id']}/tools"

    bad_alias = await client.put(url, json={"tools": [tool(sid, "search_docs", "has space")]}, headers=h)
    assert bad_alias.status_code == 422
    dup = await client.put(
        url, json={"tools": [tool(sid, "search_docs", "a"), tool(sid, "delete_page", "a")]}, headers=h
    )
    assert dup.status_code == 422 and "duplicate alias" in dup.text
    clash = await client.put(
        url, json={"tools": [tool(sid, "search_docs", "a", presets={"q": "x"}, hidden_args=["q"])]}, headers=h
    )
    assert clash.status_code == 422 and "both preset and hidden" in clash.text
    regex = await client.put(
        url,
        json={"tools": [tool(sid, "search_docs", "a", policy={"mode": "allow", "redact": [{"pattern": "(unclosed"}]})]},
        headers=h,
    )
    assert regex.status_code == 422 and "regular expression" in regex.text
    foreign = await client.put(url, json={"tools": [tool("srv_not_mine", "search_docs", "a")]}, headers=h)
    assert foreign.status_code == 422 and "unknown server" in foreign.text


async def test_settings_and_delete_revokes_scoped_keys(client, auth):
    h = auth["headers"]
    lo = (await client.post("/api/v1/loadouts", json={"name": "Temp"}, headers=h)).json()
    upd = await client.patch(
        f"/api/v1/loadouts/{lo['id']}",
        json={"settings": {"approval_timeout_s": 60, "slack_webhook": "https://hooks.slack.com/services/x"}},
        headers=h,
    )
    assert upd.status_code == 200
    assert upd.json()["settings"] == {
        "approval_timeout_s": 60,
        "agent_header": "X-Agent-Name",
        "default_timeout_s": 60,
        "slack_webhook_configured": True,
    }
    assert "hooks.slack.com" not in upd.text

    key = (
        await client.post(
            "/api/v1/keys", json={"name": "k", "scope": {"type": "loadout", "loadout_id": lo["id"]}}, headers=h
        )
    ).json()
    assert (await client.delete(f"/api/v1/loadouts/{lo['id']}", headers=h)).status_code == 204
    keys = (await client.get("/api/v1/keys", headers=h)).json()
    assert next(k for k in keys if k["id"] == key["id"])["revoked_at"] is not None
    assert (await client.get(f"/api/v1/loadouts/{lo['id']}", headers=h)).status_code == 404
