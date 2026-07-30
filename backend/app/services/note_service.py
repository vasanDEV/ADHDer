"""Note business logic."""

from __future__ import annotations

from fastapi import HTTPException, status as http_status

from app.models.note import Note
from app.repositories.note_repository import NoteRepository
from app.schemas.note import NoteCreate, NoteUpdate


def _tags_to_str(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    return ",".join(t.strip() for t in tags if t.strip()) or None


class NoteService:
    def __init__(self, repo: NoteRepository) -> None:
        self.repo = repo

    def list(self, query: str | None = None) -> list[Note]:
        if query:
            return self.repo.search(query)
        return self.repo.list_ordered()

    def get_or_404(self, note_id: int) -> Note:
        note = self.repo.get(note_id)
        if note is None:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Note not found")
        return note

    def create(self, payload: NoteCreate) -> Note:
        note = Note(
            title=payload.title or "Untitled",
            markdown=payload.markdown,
            folder=payload.folder,
            tags=_tags_to_str(payload.tags),
        )
        self.repo.add(note)
        self.repo.commit()
        self.repo.db.refresh(note)
        return note

    def update(self, note_id: int, payload: NoteUpdate) -> Note:
        note = self.get_or_404(note_id)
        data = payload.model_dump(exclude_unset=True)
        if "tags" in data:
            note.tags = _tags_to_str(data.pop("tags"))
        for field_name, value in data.items():
            setattr(note, field_name, value)
        self.repo.commit()
        self.repo.db.refresh(note)
        return note

    def delete(self, note_id: int) -> None:
        note = self.get_or_404(note_id)
        self.repo.delete(note)
        self.repo.commit()
