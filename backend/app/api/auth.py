import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    generate_state,
    generate_nonce,
    generate_code_verifier,
    build_auth_url,
    exchange_code_for_tokens,
    validate_id_token,
    fetch_userinfo,
    build_logout_url,
)
from app.models.user import User
from app.schemas import UserResponse, AuthCallbackRequest, LogoutResponse, ErrorResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

SESSION_COOKIE_NAME = "vl_session"
CSRF_COOKIE_NAME = "vl_csrf"


def set_auth_cookies(response: Response, session_data: dict, csrf_token: str) -> None:
    secure = not settings.debug
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_data,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=3600,
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE_NAME,
        csrf_token,
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=3600,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    if settings.demo_mode_allowed:
        result = await db.execute(select(User).where(User.keycloak_sub == "demo-user"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                keycloak_sub="demo-user",
                email="demo@vector-lens.local",
                username="demo",
                full_name="Demo User",
                roles="admin,operator,viewer",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import json
    try:
        session = json.loads(session_cookie)
        keycloak_sub = session.get("sub")
        if not keycloak_sub:
            raise HTTPException(status_code=401, detail="Invalid session")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    result = await db.execute(select(User).where(User.keycloak_sub == keycloak_sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


async def require_operator(user: User = Depends(get_current_user)) -> User:
    if not user.is_operator():
        raise HTTPException(status_code=403, detail="Operator role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin():
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


@router.get("/login")
async def login(request: Request) -> RedirectResponse:
    state = generate_state()
    nonce = generate_nonce()
    code_verifier = generate_code_verifier()

    request.session = {"oauth_state": state, "oauth_nonce": nonce, "code_verifier": code_verifier}

    auth_url = build_auth_url(state, nonce, code_verifier)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    session_data = getattr(request, "session", {})
    stored_state = session_data.get("oauth_state")
    stored_nonce = session_data.get("oauth_nonce")
    code_verifier = session_data.get("code_verifier")

    if not stored_state or state != stored_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    if not stored_nonce or not code_verifier:
        raise HTTPException(status_code=400, detail="Missing session data")

    token_data = await exchange_code_for_tokens(code, code_verifier)
    id_token = token_data.get("id_token")
    access_token = token_data.get("access_token")

    if not id_token or not access_token:
        raise HTTPException(status_code=400, detail="Missing tokens in response")

    claims = await validate_id_token(id_token, stored_nonce)
    userinfo = await fetch_userinfo(access_token)

    keycloak_sub = claims.get("sub")
    email = userinfo.get("email") or claims.get("email")
    username = userinfo.get("preferred_username") or claims.get("preferred_username") or email
    full_name = userinfo.get("name") or claims.get("name")

    if not keycloak_sub or not email:
        raise HTTPException(status_code=400, detail="Missing required claims")

    result = await db.execute(select(User).where(User.keycloak_sub == keycloak_sub))
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.username = username
        user.full_name = full_name
        user.last_login = datetime.now(timezone.utc)
    else:
        user = User(
            keycloak_sub=keycloak_sub,
            email=email,
            username=username,
            full_name=full_name,
            roles="viewer",
            is_active=True,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    csrf_token = secrets.token_urlsafe(32)
    session_json = {"sub": keycloak_sub, "user_id": str(user.id), "roles": user.roles}

    response = RedirectResponse(url=settings.oidc_post_logout_redirect_uri)
    set_auth_cookies(response, session_json, csrf_token)
    return response


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, response: Response) -> LogoutResponse:
    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    id_token_hint = ""

    if session_cookie:
        import json
        try:
            session = json.loads(session_cookie)
            id_token_hint = session.get("id_token", "")
        except Exception:
            pass

    clear_auth_cookies(response)
    logout_url = build_logout_url(id_token_hint)
    return LogoutResponse(logout_url=logout_url)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)