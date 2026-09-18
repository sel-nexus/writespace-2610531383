"""Provide query-only public post discovery behavior."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Post
from app.schemas.posts import PublicPostSummary

EXCERPT_MAX_LENGTH = 280


def excerpt_from_content(content: str) -> str:
    """Create a compact plain-text preview without exposing a full post body.

    Args:
        content: Persisted plain-text post body.

    Returns:
        Whitespace-normalized excerpt capped at a readable length.
    """

    normalized = " ".join(content.split())
    if len(normalized) <= EXCERPT_MAX_LENGTH:
        return normalized
    clipped = normalized[: EXCERPT_MAX_LENGTH - 1].rsplit(" ", 1)[0].strip()
    return f"{clipped or normalized[: EXCERPT_MAX_LENGTH - 1]}…"


class PostService:
    """Read safe post summaries from the durable publication store."""

    def __init__(self, session: Session) -> None:
        """Initialize public discovery with a request-scoped session.

        Args:
            session: Open SQLAlchemy session used for read-only queries.
        """

        self.session = session

    def list_public(self, limit: int) -> list[PublicPostSummary]:
        """Return newest-first safe summaries using a bounded SQLAlchemy query.

        Args:
            limit: Requested number of summaries, clamped to the public range.

        Returns:
            Allow-listed post summaries without content or author fields.
        """

        bounded_limit = min(max(limit, 1), 100)
        statement = select(Post.id, Post.title, Post.content, Post.created_at).order_by(Post.created_at.desc()).limit(bounded_limit)
        rows = self.session.execute(statement).all()
        return [
            PublicPostSummary(id=row.id, title=row.title, excerpt=excerpt_from_content(row.content), created_at=row.created_at)
            for row in rows
        ]
