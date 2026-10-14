import pytest
from httpx import AsyncClient
from app.models.user import User
from sqlalchemy import select


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_login_redirects(self, client: AsyncClient):
        response = await client.get("/auth/login", follow_redirects=False)
        assert response.status_code == 307
        assert "location" in response.headers
        assert "authorization_endpoint" in response.headers["location"] or "keycloak" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_demo_mode(self, client: AsyncClient, db_session, demo_user):
        db_session.add(demo_user)
        await db_session.commit()

        response = await client.get("/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "demo@vector-lens.local"
        assert data["username"] == "demo"
        assert "admin" in data["roles"]

    @pytest.mark.asyncio
    async def test_logout_clears_cookies(self, client: AsyncClient):
        response = await client.post("/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "logout_url" in data
        assert "vl_session" in response.headers.get("set-cookie", "")
        assert "vl_csrf" in response.headers.get("set-cookie", "")