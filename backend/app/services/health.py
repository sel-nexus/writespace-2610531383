"""Implement database-backed liveness checks."""

from sqlalchemy import text
from sqlalchemy.orm import Session


def check_database(session: Session) -> dict[str, str]:
    """Confirm that the configured database accepts a simple query.

    Args:
        session: Open session for the configured persistent database.

    Returns:
        The public health response when the query succeeds.
    """

    session.execute(text("SELECT 1"))
    return {"status": "ok"}
