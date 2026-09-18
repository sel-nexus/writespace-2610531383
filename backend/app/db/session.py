"""Create durable SQLAlchemy sessions with SQLite foreign-key enforcement."""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, event, make_url
from sqlalchemy.engine import create_engine
from sqlalchemy.orm import Session, sessionmaker


def ensure_database_directory(database_url: str) -> None:
    """Create the parent directory for a file-backed SQLite database.

    Args:
        database_url: SQLAlchemy database URL to inspect.
    """

    url = make_url(database_url)
    if url.drivername.startswith("sqlite") and url.database and url.database != ":memory:":
        Path(url.database).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


def create_database_engine(database_url: str) -> Engine:
    """Build an engine configured for durable SQLite use.

    Args:
        database_url: SQLAlchemy database URL.

    Returns:
        An engine that enforces SQLite foreign-key constraints.

    Raises:
        ValueError: If the URL selects an in-memory SQLite database.
    """

    if ":memory:" in database_url:
        raise ValueError("SQLite must be file-backed")
    ensure_database_directory(database_url)
    engine = create_engine(database_url, connect_args={"check_same_thread": False})

    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_foreign_keys(dbapi_connection: object, _: object) -> None:
            """Enable SQLite foreign-key checks for each new connection."""

            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Return a session factory bound to an existing engine.

    Args:
        engine: Initialized SQLAlchemy engine.

    Returns:
        A factory producing transactional ORM sessions.
    """

    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    """Yield one session and guarantee its closure.

    Args:
        session_factory: Factory that creates database sessions.

    Yields:
        An open SQLAlchemy session.
    """

    with session_factory() as session:
        yield session
