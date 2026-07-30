"""Note ORM model (Markdown notebook entry)."""

from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Note(TimestampMixin, Base):
    """A single Markdown note, optionally grouped into a folder."""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    folder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
