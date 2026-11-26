import pytest
import base64
import hashlib
import re

from app.core.security import compute_code_challenge, generate_code_verifier


class TestPKCE:
    """PKCE (Proof Key for Code Exchange) code verifier/challenge tests."""

    def test_compute_code_challenge_produces_correct_output(self):
        """Challenge must be SHA-256 hash of verifier, base64url encoded without padding."""
        verifier = generate_code_verifier()
        challenge = compute_code_challenge(verifier)
        digest = hashlib.sha256(verifier.encode()).digest()
        expected = base64.urlsafe_b64encode(digest).decode().rstrip("=")
        assert challenge == expected

    def test_compute_code_challenge_is_deterministic(self):
        """Same verifier must always produce the same challenge."""
        verifier = generate_code_verifier()
        challenge1 = compute_code_challenge(verifier)
        challenge2 = compute_code_challenge(verifier)
        assert challenge1 == challenge2

    def test_different_verifiers_produce_different_challenges(self):
        """Different verifiers must produce different challenges."""
        verifier1 = generate_code_verifier()
        verifier2 = generate_code_verifier()
        challenge1 = compute_code_challenge(verifier1)
        challenge2 = compute_code_challenge(verifier2)
        assert challenge1 != challenge2

    def test_challenge_is_valid_base64url_without_padding(self):
        """Challenge must be valid base64url characters without trailing =."""
        verifier = generate_code_verifier()
        challenge = compute_code_challenge(verifier)
        assert re.match(r"^[A-Za-z0-9_-]+$", challenge), (
            f"Challenge should be base64url without padding, got: {challenge}"
        )

    def test_challenge_length_is_reasonable(self):
        """Challenge for a 64-character verifier should be ~43 chars (base64url of 32 bytes)."""
        verifier = generate_code_verifier()
        challenge = compute_code_challenge(verifier)
        # SHA-256 produces 32 bytes -> base64url without padding is 43 chars
        assert len(challenge) == 43, f"Expected 43 chars, got {len(challenge)}"
