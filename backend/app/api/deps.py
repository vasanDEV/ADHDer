"""FastAPI dependency providers wiring repositories and services together."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.note_repository import NoteRepository
from app.repositories.pomodoro_repository import PomodoroRepository
from app.repositories.setting_repository import SettingRepository
from app.repositories.task_repository import TaskRepository
from app.services.note_service import NoteService
from app.services.pomodoro_service import PomodoroService
from app.services.setting_service import SettingService
from app.services.task_service import TaskService

DbSession = Annotated[Session, Depends(get_db)]


def get_task_service(db: DbSession) -> TaskService:
    return TaskService(TaskRepository(db))


def get_note_service(db: DbSession) -> NoteService:
    return NoteService(NoteRepository(db))


def get_pomodoro_service(db: DbSession) -> PomodoroService:
    return PomodoroService(PomodoroRepository(db), TaskRepository(db))


def get_setting_service(db: DbSession) -> SettingService:
    return SettingService(SettingRepository(db))


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
PomodoroServiceDep = Annotated[PomodoroService, Depends(get_pomodoro_service)]
SettingServiceDep = Annotated[SettingService, Depends(get_setting_service)]
