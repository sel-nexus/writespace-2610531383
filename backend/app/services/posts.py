"""Provide public discovery and authenticated post persistence behavior."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Post, User
from app.policies import PostPolicy
from app.schemas.posts import PostDetail, PostSummary, PostWriteRequest, PublicPostSummary


class PostForbiddenError(Exception):
    """Signal an ownership violation without exposing persistence details."""

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

    @staticmethod
    def to_summary(post: Post) -> PostSummary:
        """Map persisted post data to the authenticated safe summary DTO."""

        return PostSummary(
            id=post.id,
            title=post.title,
            author={
                "id": post.author_id,
                "display_name": post.author_name_snapshot,
                "role": post.author_role_snapshot,
            },
            created_at=post.created_at,
            updated_at=post.updated_at,
        )

    @staticmethod
    def to_detail(post: Post) -> PostDetail:
        """Map persisted post data to the existing authenticated detail DTO."""

        return PostDetail(
            id=post.id,
            title=post.title,
            content=post.content,
            author_id=post.author_id,
            author_name=post.author_name_snapshot,
            author_role=post.author_role_snapshot,
            created_at=post.created_at,
            updated_at=post.updated_at,
        )

    def list_summaries(self, limit: int) -> list[PostSummary]:
        """Return newest-first authenticated summaries within a route-bounded limit."""

        statement = select(Post).order_by(Post.created_at.desc()).limit(limit)
        return [self.to_summary(post) for post in self.session.scalars(statement).all()]

    def get(self, post_id: str) -> Post | None:
        """Load a post by its server-issued UUID string."""

        return self.session.get(Post, post_id)

    def create(self, payload: PostWriteRequest, actor: User) -> PostDetail:
        """Persist a new post with server-derived UUID, timestamps, and author snapshots."""

        now = datetime.now(UTC)
        post = Post(
            id=str(uuid4()),
            title=payload.title,
            content=payload.content,
            author_id=actor.id,
            author_name_snapshot=actor.display_name,
            author_role_snapshot=actor.role,
            created_at=now,
            updated_at=now,
        )
        try:
            self.session.add(post)
            self.session.commit()
            self.session.refresh(post)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return self.to_detail(post)

    def update(self, post_id: str, payload: PostWriteRequest, actor: User) -> PostDetail | None:
        """Persist owner-or-admin edits or raise when the existing post is forbidden."""

        post = self.get(post_id)
        if post is None:
            return None
        if not PostPolicy.can_mutate(actor, post):
            raise PostForbiddenError
        try:
            post.title = payload.title
            post.content = payload.content
            post.updated_at = datetime.now(UTC)
            self.session.commit()
            self.session.refresh(post)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return self.to_detail(post)

    def delete(self, post_id: str, actor: User) -> bool | None:
        """Delete an owner-or-admin post, returning None only when it is absent."""

        post = self.get(post_id)
        if post is None:
            return None
        if not PostPolicy.can_mutate(actor, post):
            raise PostForbiddenError
        try:
            self.session.delete(post)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return True
