"""Settings business logic. Values are JSON-encoded strings on disk."""

from __future__ import annotations

import json
from typing import Any

from app.repositories.setting_repository import SettingRepository

# Sensible defaults applied when a key has never been set by the user.
DEFAULT_SETTINGS: dict[str, Any] = {
    "theme": "system",  # light | dark | system
    "clock24Hour": True,
    "showSeconds": True,
    "workDuration": 25,
    "shortBreak": 5,
    "longBreak": 15,
    "longBreakInterval": 4,
    "autoStartNext": False,
    "completionColor": "#22c55e",
    "notificationSound": True,
    "autosaveInterval": 3,
    "exportLocation": "",
    "databaseLocation": "",
}


class SettingService:
    def __init__(self, repo: SettingRepository) -> None:
        self.repo = repo

    def get_all(self) -> dict[str, Any]:
        stored = self.repo.all_as_dict()
        merged: dict[str, Any] = dict(DEFAULT_SETTINGS)
        for key, raw in stored.items():
            try:
                merged[key] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                merged[key] = raw
        return merged

    def set(self, key: str, value: Any) -> dict[str, Any]:
        self.repo.upsert(key, json.dumps(value))
        self.repo.commit()
        return self.get_all()

    def set_many(self, values: dict[str, Any]) -> dict[str, Any]:
        for key, value in values.items():
            self.repo.upsert(key, json.dumps(value))
        self.repo.commit()
        return self.get_all()
