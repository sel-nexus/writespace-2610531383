"""Centralize post mutation authorization rules."""

from app.db.models import Post, User


class PostPolicy:
    """Authorize post mutations for owners and administrators."""

    @staticmethod
    def can_mutate(actor: User, post: Post) -> bool:
        """Return whether an actor may change or delete a post.

        Args:
            actor: Active persisted account making the request.
            post: Persisted post targeted by the mutation.

        Returns:
            True for administrators or the post owner.
        """

        return actor.role == "admin" or post.author_id == actor.id
