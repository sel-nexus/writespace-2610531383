"""Initialize durable schema and the default WriteSpace administrator."""

import bcrypt
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Base, User

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
            select(User).where(User.username == DEFAULT_ADMIN_USERNAME)
        )
        if existing_admin is None:
            password_hash = bcrypt.hashpw(
                DEFAULT_ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")
            session.add(
                User(
                    username=DEFAULT_ADMIN_USERNAME,
                    password_hash=password_hash,
                    role="admin",
                )
            )
