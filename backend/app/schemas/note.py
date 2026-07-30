"""Note request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NoteBase(BaseModel):
    title: str = Field(default="Untitled", max_length=255)
    markdown: str = ""
    folder: str | None = None
    tags: list[str] = Field(default_factory=list)


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    markdown: str | None = None
    folder: str | None = None
    tags: list[str] | None = None


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def _coerce_tags(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [t.strip() for t in value.split(",") if t.strip()]
        if value is None:
            return []
        return value  # type: ignore[return-value]
