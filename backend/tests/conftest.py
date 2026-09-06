from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.db import ensure_indexes
from app.main import app
from tests.fakes.upstream import FakeUpstreamClient


@pytest.fixture
async def db():
    url = os.environ.get("QUIVER_TEST_MONGO_URL")
    if url:
        from motor.motor_asyncio import AsyncIOMotorClient

        client = AsyncIOMotorClient(url)
        database = client["quiver_test"]
        await client.drop_database("quiver_test")
    else:
        database = AsyncMongoMockClient()["quiver_test"]
    await ensure_indexes(database)
    return database


@pytest.fixture
def upstream() -> FakeUpstreamClient:
    return FakeUpstreamClient()


@pytest.fixture
async def client(db, upstream):
    app.state.db = db
    app.state.upstream = upstream
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth(client):
    """A signed-up user and the header to act as them."""
    r = await client.post(
        "/api/v1/auth/signup", json={"email": "me@example.com", "password": "password123", "display_name": "Me"}
    )
    assert r.status_code == 201, r.text
    data = r.json()
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "user": data["user"],
        "refresh": data["refresh_token"],
    }
