"""Define WriteSpace persistence models required by the foundation."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Provide the SQLAlchemy declarative base for WriteSpace models."""


class User(Base):
    """Store an account and its safely hashed credential."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(64, collation="NOCASE"), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    is_default_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    posts: Mapped[list["Post"]] = relationship(back_populates="author", lazy="selectin")


class Post(Base):
    """Represent a durable plain-text publication with retained attribution."""

    __tablename__ = "posts"
    __table_args__ = (Index("ix_posts_created_at", "created_at"), Index("ix_posts_author_id", "author_id"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name_snapshot: Mapped[str] = mapped_column(String(100), nullable=False)
    author_role_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    author: Mapped["User"] = relationship(back_populates="posts", lazy="selectin")
