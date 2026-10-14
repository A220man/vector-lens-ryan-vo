import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    keycloak_sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    roles: Mapped[str] = mapped_column(String(500), default="viewer", nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_users_keycloak_sub", "keycloak_sub"),
        Index("ix_users_email", "email"),
    )

    def has_role(self, role: str) -> bool:
        return role in self.roles.split(",")

    def is_admin(self) -> bool:
        return self.has_role("admin")

    def is_operator(self) -> bool:
        return self.has_role("operator") or self.is_admin()