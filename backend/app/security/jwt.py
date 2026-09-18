"""Issue and verify minimal HMAC-signed JSON Web Tokens."""

from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import json


class TokenError(ValueError):
    """Represent a token that cannot establish an authenticated subject."""


def _encode(value: bytes) -> str:
    """Encode bytes as unpadded URL-safe base64.

    Args:
        value: Raw bytes to encode.

    Returns:
        URL-safe base64 text.
    """
    return urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    """Decode URL-safe base64 with restored padding.

    Args:
        value: URL-safe base64 text.

    Returns:
        Decoded bytes.

    Raises:
        TokenError: If decoding is malformed.
    """
    try:
        return urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except ValueError as exc:
        raise TokenError("Malformed token.") from exc


def issue_token(subject: str, secret: str, expires_minutes: int) -> str:
    """Create a signed JWT containing only a subject and expiration.

    Args:
        subject: Persisted account identifier.
        secret: Configured signing secret.
        expires_minutes: Token lifetime in minutes.

    Returns:
        A compact HS256 JWT.
    """
    header = _encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8"))
    expiration = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    payload = _encode(json.dumps({"sub": subject, "exp": int(expiration.timestamp())}, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _encode(hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def verify_token(token: str, secret: str) -> str:
    """Verify a JWT signature and expiration before returning its subject.

    Args:
        token: Bearer token supplied by the client.
        secret: Configured signing secret.

    Returns:
        The persisted account identifier from the token subject.

    Raises:
        TokenError: If the token is malformed, forged, expired, or lacks a subject.
    """
    try:
        header, payload, signature = token.split(".")
        signing_input = f"{header}.{payload}".encode("ascii")
        expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _decode(signature)):
            raise TokenError("Invalid token.")
        claims = json.loads(_decode(payload))
        subject = claims.get("sub")
        expiration = claims.get("exp")
        if not isinstance(subject, str) or not isinstance(expiration, int):
            raise TokenError("Invalid token claims.")
        if expiration <= int(datetime.now(UTC).timestamp()):
            raise TokenError("Expired token.")
        return subject
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        if isinstance(exc, TokenError):
            raise
        raise TokenError("Malformed token.") from exc
