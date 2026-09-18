"""Provide bcrypt password hashing helpers."""

import bcrypt


def hash_password(plaintext: str) -> str:
    """Hash a plaintext credential without retaining its original value.

    Args:
        plaintext: Password received at an authentication boundary.

    Returns:
        A bcrypt encoded password hash.
    """
    return bcrypt.hashpw(plaintext.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plaintext: str, encoded: str) -> bool:
    """Compare a plaintext credential against a stored bcrypt hash.

    Args:
        plaintext: Password received at an authentication boundary.
        encoded: Persisted bcrypt password hash.

    Returns:
        Whether the credential matches the stored hash.
    """
    try:
        return bcrypt.checkpw(plaintext.encode("utf-8"), encoded.encode("utf-8"))
    except ValueError:
        return False
