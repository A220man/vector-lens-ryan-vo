import pytest
from httpx import AsyncClient
from app.models.user import User
from sqlalchemy import select
import uuid


class TestUserModel:
    @pytest.mark.asyncio
    async def test_user_creation(self, db_session):
        user = User(
            keycloak_sub="test-sub-123",
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            roles="viewer",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.keycloak_sub == "test-sub-123"
        assert user.email == "test@example.com"
        assert user.has_role("viewer")
        assert not user.is_operator()
        assert not user.is_admin()

    @pytest.mark.asyncio
    async def test_user_roles(self, db_session):
        user = User(
            keycloak_sub="test-sub-456",
            email="operator@example.com",
            username="operator",
            roles="operator,viewer",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        assert user.has_role("operator")
        assert user.has_role("viewer")
        assert user.is_operator()
        assert not user.is_admin()

    @pytest.mark.asyncio
    async def test_user_admin_roles(self, db_session):
        user = User(
            keycloak_sub="test-sub-789",
            email="admin@example.com",
            username="admin",
            roles="admin,operator,viewer",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        assert user.is_admin()
        assert user.is_operator()
        assert user.has_role("admin")

    @pytest.mark.asyncio
    async def test_user_unique_constraints(self, db_session):
        user1 = User(
            keycloak_sub="unique-sub",
            email="unique@example.com",
            username="user1",
            is_active=True,
        )
        user2 = User(
            keycloak_sub="unique-sub",
            email="different@example.com",
            username="user2",
            is_active=True,
        )
        db_session.add(user1)
        await db_session.commit()

        db_session.add(user2)
        with pytest.raises(Exception):
            await db_session.commit()

    @pytest.mark.asyncio
    async def test_user_inactive(self, db_session):
        user = User(
            keycloak_sub="inactive-sub",
            email="inactive@example.com",
            username="inactive",
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()

        assert not user.is_active