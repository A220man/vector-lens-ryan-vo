import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import create_app
from app.core.database import get_db
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession


class TestAuthFlowIntegration:
    @pytest.mark.asyncio
    async def test_full_login_callback_logout_flow_demo(self, client: AsyncClient, db_session):
        # Login redirects to Keycloak
        login_resp = await client.get("/auth/login", follow_redirects=False)
        assert login_resp.status_code == 307

        # In demo mode, /auth/me works without Keycloak
        me_resp = await client.get("/auth/me")
        assert me_resp.status_code == 200
        user_data = me_resp.json()
        assert user_data["username"] == "demo"

        # Logout returns logout URL
        logout_resp = await client.post("/auth/logout")
        assert logout_resp.status_code == 200
        logout_data = logout_resp.json()
        assert "logout_url" in logout_data
        assert "keycloak" in logout_data["logout_url"]

    @pytest.mark.asyncio
    async def test_cors_headers(self, client: AsyncClient):
        response = await client.options("/health", headers={"Origin": "http://localhost:5173"})
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert "access-control-allow-credentials" in response.headers
        assert response.headers["access-control-allow-credentials"] == "true"

    @pytest.mark.asyncio
    async def test_cors_rejects_unknown_origin(self, client: AsyncClient):
        response = await client.options("/health", headers={"Origin": "http://evil.com"})
        assert response.status_code == 200
        # Should not include evil.com in allowed origins
        allowed = response.headers.get("access-control-allow-origin", "")
        assert allowed != "http://evil.com"

    @pytest.mark.asyncio
    async def test_docs_available_in_debug(self, client: AsyncClient):
        response = await client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_openapi_json(self, client: AsyncClient):
        response = await client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert data["info"]["title"] == "vector-lens-ryan-vo"
        assert data["info"]["version"] == "1.0.0"
        assert "/health" in data["paths"]
        assert "/auth/me" in data["paths"]