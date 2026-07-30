"""Settings key/value data access."""

from __future__ import annotations

from sqlalchemy import select

from app.models.setting import Setting
from app.repositories.base import BaseRepository


class SettingRepository(BaseRepository[Setting]):
    model = Setting

    def get_by_key(self, key: str) -> Setting | None:
        return self.db.get(Setting, key)

    def all_as_dict(self) -> dict[str, str]:
        rows = self.db.execute(select(Setting)).scalars().all()
        return {row.key: row.value for row in rows}

    def upsert(self, key: str, value: str) -> Setting:
        existing = self.get_by_key(key)
        if existing is None:
            existing = Setting(key=key, value=value)
            self.db.add(existing)
        else:
            existing.value = value
        self.db.flush()
        return existing
