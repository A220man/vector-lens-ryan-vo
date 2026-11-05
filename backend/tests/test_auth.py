import pytest
from httpx import AsyncClient
from app.models.user import User
from sqlalchemy import select
from app.core.config import get_settings


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_login_redirects(self, client: AsyncClient):
        response = await client.get("/auth/login", follow_redirects=False)
        assert response.status_code == 307
        assert "location" in response.headers
        settings = get_settings()
        # In test env, keycloak_url is http://localhost:8080
        assert settings.keycloak_url in response.headers["location"]
        assert "realms/vector-lens/protocol/openid-connect/auth" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_me_unauthenticated(self, client: AsyncClient):
        # In demo mode, /auth/me returns a demo user instead of 401
        # This test verifies the demo mode behavior
        response = await client.get("/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "demo"
        assert data["email"] == "demo@vector-lens.local"

    @pytest.mark.asyncio
    async def test_me_demo_mode(self, client: AsyncClient, db_session):
        # Demo user is auto-created by get_current_user in demo mode
        # Don't add it manually to avoid unique constraint violation
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