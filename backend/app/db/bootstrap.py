"""Initialize durable schema and the default WriteSpace administrator."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Base, User
from app.security.passwords import hash_password

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"


def bootstrap_database(engine: Engine, session_factory: sessionmaker[Session]) -> None:
    """Create tables and seed exactly one default administrator.

    Args:
        engine: Engine that owns the durable schema.
        session_factory: Factory used for the idempotent seed transaction.
    """

    Base.metadata.create_all(bind=engine)
    with session_factory.begin() as session:
        existing_admin = session.scalar(
            select(User).where(func.lower(User.username) == DEFAULT_ADMIN_USERNAME)
        )
        if existing_admin is None:
            session.add(
                User(
                    id=str(uuid4()),
                    display_name="WriteSpace Administrator",
                    username=DEFAULT_ADMIN_USERNAME,
                    password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                    role="admin",
                    is_default_admin=True,
                    is_active=True,
                    created_at=datetime.now(UTC),
                )
            )
