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

- **Python 3.11–3.13** (3.12 recommended). Python **3.14 is not yet supported** —
  some pinned dependencies (e.g. `pydantic-core`) have no prebuilt wheels for it,
  so pip would try to compile them from Rust source and fail unless you have the
  MSVC C++ toolchain installed. See [Troubleshooting](#troubleshooting).
- Node.js 18+ and `pnpm`
- **Desktop shell / installer (Windows only):**
  - [Rust](https://www.rust-lang.org/tools/install) (stable, via `rustup`)
  - [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++") — needed to compile the Rust shell
  - WebView2 runtime (preinstalled on Windows 11)

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

The desktop shell renders the same frontend inside the system WebView2 and, in
packaged builds, launches the FastAPI backend as a **sidecar** process. In
development you run the backend/frontend yourself (best for Python debugging):

```powershell
# Terminal 1 – backend (auto-reload)
cd backend
uvicorn app.main:app --reload --port 8756

# Terminal 2 – desktop shell (auto-starts the Vite dev server)
cd desktop
pnpm dlx @tauri-apps/cli dev
```

## Building the Windows installer

Run these on **Windows** (the desktop shell targets WebView2 and cannot be built
on Linux/macOS). Make sure the desktop prerequisites above are installed.

### 1. Build the backend sidecar (PyInstaller)

Bundle the Python backend into a single `.exe` so end users don't need Python:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt pyinstaller
pyinstaller --name adhder-backend --onefile run_server.py
```

This produces `backend\dist\adhder-backend.exe`. Tauri expects the sidecar named
with the Rust **target triple** (find yours with `rustc -Vv`; on 64-bit Windows
it is `x86_64-pc-windows-msvc`). Copy it into `desktop\binaries\`:

```powershell
mkdir ..\desktop\binaries -Force
copy dist\adhder-backend.exe ..\desktop\binaries\adhder-backend-x86_64-pc-windows-msvc.exe
```

This matches the `externalBin` entry in `desktop/tauri.conf.json`.

### 2. Generate app icons (one-time)

Tauri requires the icon assets referenced in `tauri.conf.json`. Generate them
from any square source PNG (≥ 512×512):

```powershell
cd ..\desktop
pnpm dlx @tauri-apps/cli icon path\to\logo.png   # writes desktop\icons\
```

### 3. Build the installer

```powershell
cd desktop
pnpm dlx @tauri-apps/cli build
```

Tauri automatically builds the frontend (`beforeBuildCommand` runs
`pnpm --dir ../frontend build`), compiles the Rust shell, and emits installers:

| Format | Output path |
| ------ | ----------- |
| MSI (WiX)  | `desktop\target\release\bundle\msi\ADHDer_0.1.0_x64_en-US.msi` |
| NSIS setup | `desktop\target\release\bundle\nsis\ADHDer_0.1.0_x64-setup.exe` |

Distribute either installer. On launch the shell spawns the bundled
`adhder-backend` sidecar and loads the packaged frontend in WebView2. See
[`desktop/README.md`](desktop/README.md) for more detail.

## Features

- **Dashboard** — a calm, centered live clock (12/24h, seconds) with a subtle analog clock, the current task, today's focus progress, and a distraction-free full-screen **Focus Mode**.
- **Pomodoro** — configurable work/break durations, progress ring, start/pause/resume/stop/skip, a gentle window color **fade** + sound + notification on completion, per-task linking, statistics.
- **Tasks** — 3-column board (To Do / Currently Working / Finished) with drag-and-drop, floating cards, priority dots, due dates, tags, estimated/completed pomodoros, search and filters.
- **Planner** — month/week/day calendar; entries are the same records as the Task Board (bidirectional sync); completion reflects across both.
- **Notes** — Markdown notebook with live/split preview (GFM tables, checkboxes, code, math via KaTeX), search, tags and autosave.
- **Settings** — theme (light/dark/system), clock format, Pomodoro durations, completion color, notification sound, autosave interval, data locations.

Keyboard shortcuts: `Ctrl+N` new task, `Ctrl+Shift+N` new note, `Ctrl+S` save,
`Ctrl+F` search, `Space` start/pause timer.

## Troubleshooting

### `Failed building wheel for pydantic-core` / `error: linker link.exe not found`

This happens when the backend virtualenv uses a **Python version that has no
prebuilt wheels** for the pinned dependencies (most commonly **Python 3.14**).
pip then tries to build `pydantic-core` from Rust source, which needs the MSVC
linker (`link.exe`) that isn't installed by default.

**Fix (recommended):** recreate the venv with Python 3.11–3.13:

```powershell
Remove-Item -Recurse -Force .venv
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt pyinstaller
```

Check the interpreter version at any time with `python --version`.

**Alternative:** stay on Python 3.14 and install the
[Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
("Desktop development with C++") plus Rust, so the from-source build can link.
This is slower and heavier than simply using Python 3.12.
