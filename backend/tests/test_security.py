import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.security import (
    generate_state,
    generate_nonce,
    generate_code_verifier,
    compute_code_challenge,
    build_auth_url,
)
from app.core.config import Settings


class TestSecurityUtilities:
    def test_generate_state(self):
        state1 = generate_state()
        state2 = generate_state()
        assert len(state1) > 20
        assert state1 != state2

    def test_generate_nonce(self):
        nonce1 = generate_nonce()
        nonce2 = generate_nonce()
        assert len(nonce1) > 20
        assert nonce1 != nonce2

    def test_generate_code_verifier(self):
        cv1 = generate_code_verifier()
        cv2 = generate_code_verifier()
        assert len(cv1) > 40
        assert cv1 != cv2

    def test_compute_code_challenge(self):
        verifier = "test-verifier-123"
        challenge = compute_code_challenge(verifier)
        assert len(challenge) > 0
        assert "=" not in challenge
        assert "+" not in challenge
        assert "/" not in challenge

    def test_compute_code_challenge_deterministic(self):
        verifier = "fixed-verifier"
        challenge1 = compute_code_challenge(verifier)
        challenge2 = compute_code_challenge(verifier)
        assert challenge1 == challenge2

    @patch("app.core.security.fetch_oidc_config")
    def test_build_auth_url(self, mock_fetch):
        mock_config = MagicMock()
        mock_config.authorization_endpoint = "https://keycloak.example.com/auth"
        mock_fetch.return_value = mock_config

        url = build_auth_url("state123", "nonce456", "verifier789")
        assert "https://keycloak.example.com/auth" in url
        assert "state=state123" in url
        assert "nonce=nonce456" in url
        assert "code_challenge=" in url
        assert "code_challenge_method=S256" in url
        assert "client_id=" in url
        assert "redirect_uri=" in url
        assert "response_type=code" in url
        assert "scope=openid+profile+email" in url