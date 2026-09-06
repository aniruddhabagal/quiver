async def test_key_lifecycle(client, auth):
    r = await client.post("/api/v1/keys", json={"name": "release-bot"}, headers=auth["headers"])
    assert r.status_code == 201
    created = r.json()
    assert created["plaintext"].startswith("qv_")
    assert created["prefix"] == created["plaintext"][:10]

    listed = await client.get("/api/v1/keys", headers=auth["headers"])
    assert listed.status_code == 200
    assert "plaintext" not in listed.json()[0]

    gone = await client.delete(f"/api/v1/keys/{created['id']}", headers=auth["headers"])
    assert gone.status_code == 204
    again = await client.delete(f"/api/v1/keys/{created['id']}", headers=auth["headers"])
    assert again.status_code == 404
    assert (await client.get("/api/v1/keys", headers=auth["headers"])).json()[0]["revoked_at"]


async def test_loadout_scoped_key_needs_existing_loadout(client, auth):
    r = await client.post(
        "/api/v1/keys",
        json={"name": "x", "scope": {"type": "loadout", "loadout_id": "lo_missing"}},
        headers=auth["headers"],
    )
    assert r.status_code == 404
    r = await client.post("/api/v1/keys", json={"name": "x", "scope": {"type": "loadout"}}, headers=auth["headers"])
    assert r.status_code == 422
