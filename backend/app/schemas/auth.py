"""Define validated authentication requests and safe response DTOs."""

from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


class RegisterRequest(BaseModel):
    """Validate credentials supplied by a prospective writer."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    display_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        """Require a portable, nonblank username.

        Args:
            value: Trimmed username submitted by the client.

        Returns:
            The accepted username.

        Raises:
            ValueError: If the username has unsupported characters.
        """
        if not USERNAME_PATTERN.fullmatch(value):
            raise ValueError("Username may use letters, numbers, dots, underscores, and hyphens only.")
        return value


class LoginRequest(BaseModel):
    """Validate credentials supplied to create a session."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class SafeProfile(BaseModel):
    """Expose only safe persisted account information."""

    id: str
    display_name: str
    username: str
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    """Return an access token with the authoritative safe profile."""

    access_token: str
    token_type: str = "bearer"
    profile: SafeProfile
