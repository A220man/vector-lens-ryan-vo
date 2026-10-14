import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.config import Settings


class TestConfig:
    def test_settings_defaults(self):
        settings = Settings(
            secret_key="a" * 32,
            database_url="sqlite+aiosqlite:///./test.db",
        )
        assert settings.app_name == "vector-lens-ryan-vo"
        assert settings.app_env == "development"
        assert settings.debug is True
        assert settings.backend_port == 8000

    def test_cors_origins_parsing(self):
        settings = Settings(
            secret_key="a" * 32,
            backend_cors_origins="http://localhost:5173, http://127.0.0.1:5173 ,https://example.com",
        )
        origins = settings.cors_origins
        assert len(origins) == 3
        assert "http://localhost:5173" in origins
        assert "http://127.0.0.1:5173" in origins
        assert "https://example.com" in origins

    def test_is_production(self):
        settings_dev = Settings(secret_key="a" * 32, app_env="development")
        settings_prod = Settings(secret_key="a" * 32, app_env="production")
        settings_staging = Settings(secret_key="a" * 32, app_env="staging")

        assert not settings_dev.is_production
        assert settings_prod.is_production
        assert not settings_staging.is_production

    def test_demo_mode_allowed(self):
        settings_dev_debug = Settings(secret_key="a" * 32, app_env="development", debug=True)
        settings_dev_no_debug = Settings(secret_key="a" * 32, app_env="development", debug=False)
        settings_prod_debug = Settings(secret_key="a" * 32, app_env="production", debug=True)
        settings_prod_no_debug = Settings(secret_key="a" * 32, app_env="production", debug=False)

        assert settings_dev_debug.demo_mode_allowed
        assert not settings_dev_no_debug.demo_mode_allowed
        assert not settings_prod_debug.demo_mode_allowed
        assert not settings_prod_no_debug.demo_mode_allowed