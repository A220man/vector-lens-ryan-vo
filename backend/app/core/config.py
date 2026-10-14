from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "vector-lens-ryan-vo"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = Field(default="dev-secret-change-in-production", min_length=32)

    # Database
    database_url: str = "sqlite+aiosqlite:///./vector_lens.db"

    # Keycloak / OIDC
    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "vector-lens"
    keycloak_client_id: str = "vector-lens-frontend"
    keycloak_client_secret: str = "change-me"
    keycloak_admin_user: str = "admin"
    keycloak_admin_password: str = "admin"
    oidc_discovery_url: str = "http://localhost:8080/realms/vector-lens/.well-known/openid-configuration"
    oidc_redirect_uri: str = "http://localhost:5173/callback"
    oidc_post_logout_redirect_uri: str = "http://localhost:5173"

    # Backend
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # LLM (optional)
    llm_api_key: Optional[str] = None
    llm_provider: str = "openai-compatible"
    llm_model: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_timeout_seconds: int = 30

    # Embedding model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_device: str = "cpu"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def demo_mode_allowed(self) -> bool:
        return not self.is_production and self.debug


@lru_cache
def get_settings() -> Settings:
    return Settings()