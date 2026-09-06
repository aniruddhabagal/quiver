async def test_signup_login_refresh_me(client):
    r = await client.post(
        "/api/v1/auth/signup", json={"email": "A@Example.com", "password": "password123", "display_name": "A"}
    )
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "a@example.com"

    dup = await client.post(
        "/api/v1/auth/signup", json={"email": "a@example.com", "password": "password123", "display_name": "A"}
    )
    assert dup.status_code == 409

    bad = await client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "wrongwrong"})
    assert bad.status_code == 401

    ok = await client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert ok.status_code == 200
    tokens = ok.json()

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200 and me.json()["display_name"] == "A"

    # refresh tokens are not access tokens
    nope = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert nope.status_code == 401

    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 200 and refreshed.json()["access_token"]


async def test_me_requires_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"
