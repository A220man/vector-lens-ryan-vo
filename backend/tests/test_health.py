import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "vector-lens-ryan-vo"
        assert data["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_ready_endpoint(self, client: AsyncClient):
        response = await client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert "ready" in data
        assert "checks" in data
        assert "database" in data["checks"]
        assert data["checks"]["database"] == "ok"