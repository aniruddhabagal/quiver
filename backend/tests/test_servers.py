from app.utils.crypto import decrypt_json
from app.utils.upstream import UpstreamError, build_auth_headers


async def test_create_fetches_manifest_and_hides_secret(client, auth, db):
    r = await client.post(
        "/api/v1/servers",
        json={"name": "docs", "url": "https://mcp.example.com/mcp", "auth": {"type": "bearer", "value": "s3cret"}},
        headers=auth["headers"],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert [t["name"] for t in body["manifest"]["tools"]] == ["search_docs", "delete_page"]
    assert body["status"] == "healthy"
    assert body["detected_transport"] == "streamable_http"
    assert body["auth"] == {"type": "bearer", "header_name": None, "has_credentials": True}
    assert "s3cret" not in r.text

    stored = await db.servers.find_one({"_id": body["id"]})
    assert decrypt_json(stored["auth"]["enc"]) == {"value": "s3cret"}
    assert build_auth_headers(stored) == {"Authorization": "Bearer s3cret"}

    tools = await client.get(f"/api/v1/servers/{body['id']}/tools", headers=auth["headers"])
    assert tools.status_code == 200 and len(tools.json()) == 2


async def test_duplicate_name_and_ownership(client, auth):
    payload = {"name": "docs", "url": "https://mcp.example.com/mcp"}
    assert (await client.post("/api/v1/servers", json=payload, headers=auth["headers"])).status_code == 201
    assert (await client.post("/api/v1/servers", json=payload, headers=auth["headers"])).status_code == 409

    other = await client.post(
        "/api/v1/auth/signup", json={"email": "o@example.com", "password": "password123", "display_name": "O"}
    )
    headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    assert (await client.get("/api/v1/servers", headers=headers)).json() == []


async def test_unreachable_server_is_recorded_not_raised(client, auth, upstream):
    upstream.fail_with = UpstreamError("unreachable", "upstream unreachable: connection refused")
    r = await client.post(
        "/api/v1/servers", json={"name": "dead", "url": "https://dead.example.com/mcp"}, headers=auth["headers"]
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "down"
    assert "unreachable" in body["manifest"]["error"]

    upstream.fail_with = None
    probed = await client.post(f"/api/v1/servers/{body['id']}/probe", headers=auth["headers"])
    assert probed.json()["status"] == "healthy"
