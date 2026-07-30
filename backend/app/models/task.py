"""Task ORM model (Kanban card + planner entry)."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin
from app.models.enums import Priority, TaskStatus


class Task(TimestampMixin, Base):
    """A unit of work shown on the Kanban board and the planner."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=20), default=TaskStatus.TODO, nullable=False
    )
    priority: Mapped[Priority] = mapped_column(
        Enum(Priority, native_enum=False, length=20), default=Priority.MEDIUM, nullable=False
    )

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Date used by the planner to bucket tasks day-wise.
    planner_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Ordering within a Kanban column.
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    estimated_pomodoros: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_pomodoros: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Comma-separated tags kept simple for an offline single-user app.
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
