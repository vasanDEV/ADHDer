# ADHDer

A minimal, offline-first **Windows desktop productivity app** — Pomodoro timer,
Kanban task board, bidirectional planner, and a Markdown notebook — with a
Windows 11 aesthetic, dark/light themes and smooth animations.

- **Frontend:** React + TypeScript + Vite + [Fluent UI](https://react.fluentui.dev/) + React Router + React DnD + Framer Motion + Markdown editor + custom calendar
- **Backend:** Python + FastAPI + SQLAlchemy + SQLite (local REST API, no cloud)
- **Desktop shell:** Tauri v2 (system WebView2) with the backend as a Python sidecar

Everything runs completely locally: no account, no login, no cloud dependency.

## Repository layout

```
backend/     FastAPI + SQLAlchemy + SQLite (api / services / repositories / models)
frontend/    React + TypeScript + Vite app (pages / components / hooks / stores / services)
desktop/     Tauri v2 shell (WebView2) that hosts the frontend and spawns the backend
```

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 18+ and `pnpm`
- (Desktop shell only, on Windows) Rust stable + WebView2 runtime

## Quick start (development)

Run the backend and frontend in two terminals. In development the app runs in
your browser (this is exactly what the WebView2 shell renders in production).

### 1. Backend (FastAPI, port 8756)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8756
```

- API docs: http://127.0.0.1:8756/docs
- Health check: http://127.0.0.1:8756/health
- SQLite DB is created at `~/.adhder/adhder.db`.

### 2. Frontend (Vite, port 5173)

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173. The Vite dev server proxies `/api` and `/health`
to the backend, so no CORS/config changes are needed.

## Testing, linting, building

| Area     | Command (from directory)                          | Purpose            |
| -------- | ------------------------------------------------- | ------------------ |
| Backend  | `pytest` (`backend/`, venv active)                | Run API test suite |
| Frontend | `pnpm typecheck` (`frontend/`)                    | TypeScript check   |
| Frontend | `pnpm lint` (`frontend/`)                         | ESLint             |
| Frontend | `pnpm build` (`frontend/`)                        | Production bundle  |

## Desktop app (Tauri + WebView2)

See [`desktop/README.md`](desktop/README.md) for full development, packaging and
icon-generation instructions. In short:

```bash
# backend running in one terminal (as above), then:
cd desktop
pnpm dlx @tauri-apps/cli dev
```

Packaging produces `.msi` / `.nsis` installers; the backend is bundled as a
sidecar built with PyInstaller.

## Features

- **Dashboard** — large live clock (12/24h, seconds, fullscreen), analog clock, daily focus stats, quote/weather placeholders.
- **Pomodoro** — configurable work/break durations, progress ring, start/pause/resume/stop/skip, window color flash + sound + notification on completion, per-task linking, statistics.
- **Tasks** — 3-column Kanban (To Do / Currently Working / Finished) with drag-and-drop, priorities, due dates, tags, estimated/completed pomodoros, search and filters.
- **Planner** — month/week/day calendar; entries are the same records as the Task Board (bidirectional sync); completion reflects across both.
- **Notes** — Markdown notebook with live/split preview (GFM tables, checkboxes, code, math via KaTeX), search, tags and autosave.
- **Settings** — theme (light/dark/system), clock format, Pomodoro durations, completion color, notification sound, autosave interval, data locations.

Keyboard shortcuts: `Ctrl+N` new task, `Ctrl+Shift+N` new note, `Ctrl+S` save,
`Ctrl+F` search, `Space` start/pause timer.
