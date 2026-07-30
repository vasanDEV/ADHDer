"""Pomodoro-session data access and statistics aggregation."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select

from app.models.pomodoro import PomodoroSession
from app.repositories.base import BaseRepository


class PomodoroRepository(BaseRepository[PomodoroSession]):
    model = PomodoroSession

    def count_work_since(self, since: datetime) -> int:
        stmt = select(func.count()).where(
            PomodoroSession.kind == "work",
            PomodoroSession.completed.is_(True),
            PomodoroSession.start >= since,
        )
        return int(self.db.execute(stmt).scalar_one())

    def count_work_total(self) -> int:
        stmt = select(func.count()).where(
            PomodoroSession.kind == "work",
            PomodoroSession.completed.is_(True),
        )
        return int(self.db.execute(stmt).scalar_one())

    def focus_seconds_since(self, since: datetime) -> int:
        stmt = select(func.coalesce(func.sum(PomodoroSession.duration), 0)).where(
            PomodoroSession.kind == "work",
            PomodoroSession.completed.is_(True),
            PomodoroSession.start >= since,
        )
        return int(self.db.execute(stmt).scalar_one())

    def focus_seconds_total(self) -> int:
        stmt = select(func.coalesce(func.sum(PomodoroSession.duration), 0)).where(
            PomodoroSession.kind == "work",
            PomodoroSession.completed.is_(True),
        )
        return int(self.db.execute(stmt).scalar_one())
