"""Define validated administrative user requests and aggregate responses."""

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.auth import RegisterRequest


class AdminCreateUser(RegisterRequest):
    """Validate an administrator-created account with a normalized role."""

    role: str = Field(min_length=1, max_length=16)

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        """Accept only supported roles regardless of input casing."""
        normalized = value.casefold()
        if normalized not in {"user", "admin"}:
            raise ValueError("Role must be user or admin.")
        return normalized


class AdminStats(BaseModel):
    """Expose bounded administrative aggregate counts."""

    user_count: int
    post_count: int
    recent_post_count: int
