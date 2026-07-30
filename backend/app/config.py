"""Application configuration.

Settings are read from environment variables (prefixed with ``ADHDER_``) with
sensible offline-first defaults. The application is designed to run fully
locally with no cloud dependency.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    """Return the per-user data directory used to store the SQLite database."""
    return Path.home() / ".adhder"


class Settings(BaseSettings):
    """Runtime configuration for the ADHDer backend."""

    model_config = SettingsConfigDict(env_prefix="ADHDER_", env_file=".env", extra="ignore")

    app_name: str = "ADHDer"
    debug: bool = True

    # Where the SQLite database file lives. Configurable via Settings page.
    data_dir: Path = _default_data_dir()
    database_filename: str = "adhder.db"

    # Local API server binding.
    host: str = "127.0.0.1"
    port: int = 8756

    # Origins allowed to talk to the local API (Vite dev server + Tauri).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
        "https://tauri.localhost",
    ]

    @property
    def database_path(self) -> Path:
        return self.data_dir / self.database_filename

    @property
    def database_url(self) -> str:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{self.database_path}"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
