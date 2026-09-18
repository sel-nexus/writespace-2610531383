"""Define safe post projections for public discovery."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostWriteRequest(BaseModel):
    """Accept only editable plain-text post fields from a client."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(max_length=200)
    content: str = Field(max_length=10000)

    @field_validator("title", "content")
    @classmethod
    def trim_nonblank_text(cls, value: str) -> str:
        """Trim submitted text and reject blank post fields."""

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Post fields must not be blank.")
        return trimmed


class PostAuthor(BaseModel):
    """Expose server-derived attribution for authenticated post summaries."""

    id: str | None
    display_name: str
    role: str


class PostSummary(BaseModel):
    """Expose an authenticated post list projection without full content."""

    id: str
    title: str
    author: PostAuthor
    created_at: datetime
    updated_at: datetime


class PostDetail(BaseModel):
    """Expose the full plain-text post using the existing detail contract."""

    id: str
    title: str
    content: str
    author_id: str | None
    author_name: str
    author_role: str
    created_at: datetime
    updated_at: datetime


class PublicPostSummary(BaseModel):
    """Expose an allow-listed post preview to anonymous visitors."""

    id: str
    title: str
    excerpt: str
    created_at: datetime
