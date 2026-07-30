"""Markdown notebook REST endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import NoteServiceDep
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
def list_notes(service: NoteServiceDep, q: str | None = None) -> list[NoteRead]:
    return service.list(q)  # type: ignore[return-value]


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate, service: NoteServiceDep) -> NoteRead:
    return service.create(payload)  # type: ignore[return-value]


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int, service: NoteServiceDep) -> NoteRead:
    return service.get_or_404(note_id)  # type: ignore[return-value]


@router.patch("/{note_id}", response_model=NoteRead)
def update_note(note_id: int, payload: NoteUpdate, service: NoteServiceDep) -> NoteRead:
    return service.update(note_id, payload)  # type: ignore[return-value]


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, service: NoteServiceDep):
    service.delete(note_id)
