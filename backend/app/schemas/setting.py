"""Settings schemas. Settings are a free-form key/value JSON store."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, RootModel


class SettingUpdate(BaseModel):
    value: Any


class SettingsMap(RootModel[dict[str, Any]]):
    """A whole map of settings keys to arbitrary JSON values."""

    root: dict[str, Any]
