import secrets
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode
import httpx
from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()


@dataclass
class OIDCConfig:
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str
    userinfo_endpoint: str
    end_session_endpoint: str


_oidc_config_cache: Optional[OIDCConfig] = None
_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0
JWKS_TTL = 3600


async def fetch_oidc_config() -> OIDCConfig:
    global _oidc_config_cache
    if _oidc_config_cache:
        return _oidc_config_cache

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(settings.oidc_discovery_url)
        resp.raise_for_status()
        data = resp.json()

    _oidc_config_cache = OIDCConfig(
        issuer=data["issuer"],
        authorization_endpoint=data["authorization_endpoint"],
        token_endpoint=data["token_endpoint"],
        jwks_uri=data["jwks_uri"],
        userinfo_endpoint=data.get("userinfo_endpoint", ""),
        end_session_endpoint=data.get("end_session_endpoint", ""),
    )
    return _oidc_config_cache


async def fetch_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_TTL:
        return _jwks_cache

    oidc = await fetch_oidc_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(oidc.jwks_uri)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = now
    return _jwks_cache


def build_auth_url(state: str, nonce: str, code_verifier: str) -> str:
    oidc = None
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            pass
        else:
            oidc = loop.run_until_complete(fetch_oidc_config())
    except RuntimeError:
        pass

    if not oidc:
        oidc = OIDCConfig(
            issuer="",
            authorization_endpoint=f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/auth",
            token_endpoint="",
            jwks_uri="",
            userinfo_endpoint="",
            end_session_endpoint="",
        )

    code_challenge = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.keycloak_client_id,
        "response_type": "code",
        "scope": "openid profile email",
        "redirect_uri": settings.oidc_redirect_uri,
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{oidc.authorization_endpoint}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str, code_verifier: str) -> dict:
    oidc = await fetch_oidc_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            oidc.token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.oidc_redirect_uri,
                "client_id": settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
                "code_verifier": code_verifier,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def validate_id_token(id_token: str, nonce: str) -> dict:
    jwks = await fetch_jwks()
    oidc = await fetch_oidc_config()

    unverified_header = jwt.get_unverified_header(id_token)
    kid = unverified_header.get("kid")
    if not kid:
        raise JWTError("Missing kid in token header")

    key = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
    if not key:
        raise JWTError("Key not found in JWKS")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
    claims = jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=settings.keycloak_client_id,
        issuer=oidc.issuer,
        options={"verify_at_hash": False},
    )

    if claims.get("nonce") != nonce:
        raise JWTError("Nonce mismatch")

    return claims


async def fetch_userinfo(access_token: str) -> dict:
    oidc = await fetch_oidc_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            oidc.userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def build_logout_url(id_token_hint: str) -> str:
    oidc = OIDCConfig(
        issuer="",
        authorization_endpoint="",
        token_endpoint="",
        jwks_uri="",
        userinfo_endpoint="",
        end_session_endpoint=f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/logout",
    )
    params = {
        "client_id": settings.keycloak_client_id,
        "post_logout_redirect_uri": settings.oidc_post_logout_redirect_uri,
        "id_token_hint": id_token_hint,
    }
    return f"{oidc.end_session_endpoint}?{urlencode(params)}"


def generate_state() -> str:
    return secrets.token_urlsafe(32)


def generate_nonce() -> str:
    return secrets.token_urlsafe(32)


def generate_code_verifier() -> str:
    return secrets.token_urlsafe(64)


def compute_code_challenge(code_verifier: str) -> str:
    import hashlib
    import base64
    digest = hashlib.sha256(code_verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")