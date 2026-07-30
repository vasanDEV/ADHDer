"""Note-specific data access."""

from __future__ import annotations

from sqlalchemy import or_, select

from app.models.note import Note
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[Note]):
    model = Note

    def list_ordered(self) -> list[Note]:
        stmt = select(Note).order_by(Note.updated_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def search(self, query: str) -> list[Note]:
        like = f"%{query}%"
        stmt = (
            select(Note)
            .where(or_(Note.title.ilike(like), Note.markdown.ilike(like)))
            .order_by(Note.updated_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())
