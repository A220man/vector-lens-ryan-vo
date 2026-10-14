from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx
from app.core.config import get_settings
from app.core.database import get_db
from app.schemas import HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse()


@router.get("/ready", response_model=ReadyResponse)
async def readiness_check(db: AsyncSession = Depends(get_db)) -> ReadyResponse:
    checks = {}
    all_ready = True

    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"failed: {e}"
        all_ready = False

    # Keycloak check (only in production or when configured)
    if not settings.demo_mode_allowed:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.keycloak_url}/health/ready")
                if resp.status_code == 200:
                    checks["keycloak"] = "ok"
                else:
                    checks["keycloak"] = f"unhealthy: {resp.status_code}"
                    all_ready = False
        except Exception as e:
            checks["keycloak"] = f"failed: {e}"
            all_ready = False
    else:
        checks["keycloak"] = "skipped (demo mode)"

    return ReadyResponse(ready=all_ready, checks=checks)