from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import uuid


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "vector-lens-ryan-vo"
    version: str = "1.0.0"


class ReadyResponse(BaseModel):
    ready: bool
    checks: dict


class UserBase(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    roles: str = "viewer"


class UserCreate(UserBase):
    keycloak_sub: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    keycloak_sub: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthCallbackRequest(BaseModel):
    code: str
    state: str


class LogoutResponse(BaseModel):
    logout_url: str


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None