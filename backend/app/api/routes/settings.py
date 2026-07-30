"""Settings (preferences) REST endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.api.deps import SettingServiceDep
from app.schemas.setting import SettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=dict[str, Any])
def get_settings(service: SettingServiceDep) -> dict[str, Any]:
    return service.get_all()


@router.put("", response_model=dict[str, Any])
def update_settings(payload: dict[str, Any], service: SettingServiceDep) -> dict[str, Any]:
    return service.set_many(payload)


@router.put("/{key}", response_model=dict[str, Any])
def update_setting(key: str, payload: SettingUpdate, service: SettingServiceDep) -> dict[str, Any]:
    return service.set(key, payload.value)
