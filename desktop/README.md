# ADHDer Desktop Shell (Tauri v2 + WebView2)

This directory holds the native Windows shell. It renders the React frontend
inside the system **WebView2** runtime (via Tauri v2) and, in packaged builds,
launches the FastAPI backend as a **sidecar** process.

## Why Tauri + WebView2 (not Electron)

- Uses the OS WebView2 on Windows — small binaries (~10–20 MB) instead of 100+ MB.
- Native notifications, tray, filesystem and window effects.
- The Python FastAPI backend runs as a sidecar, so backend debugging stays
  identical to running it standalone.

## Prerequisites (Windows)

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Node.js 18+ and `pnpm`
- WebView2 runtime (preinstalled on Windows 11)
- Tauri CLI: `pnpm add -g @tauri-apps/cli` (or use `pnpm dlx`)

## Development

Run the backend and frontend yourself for the best debugging experience:

```powershell
# Terminal 1 – backend (auto-reload)
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8756

# Terminal 2 – desktop shell (loads the Vite dev server)
cd desktop
pnpm dlx @tauri-apps/cli dev --config tauri.conf.json
```

`beforeDevCommand` starts the Vite dev server automatically; the shell loads
`http://127.0.0.1:5173`.

## Packaging (Windows installer)

1. Build a standalone backend binary with PyInstaller and copy it to
   `desktop/binaries/adhder-backend-x86_64-pc-windows-msvc.exe`
   (the `externalBin` entry in `tauri.conf.json`).

   ```powershell
   cd backend
   pip install pyinstaller
   pyinstaller --name adhder-backend --onefile run_server.py
   ```

2. Build the installer:

   ```powershell
   cd desktop
   pnpm dlx @tauri-apps/cli build
   ```

   Produces `.msi` / `.nsis` installers under `desktop/target/release/bundle/`.

## Icons

Tauri requires icon assets referenced in `tauri.conf.json`. Generate them from a
single source PNG with:

```powershell
pnpm dlx @tauri-apps/cli icon path\to\logo.png
```

This writes `icons/` (32x32.png, 128x128.png, icon.ico, etc.). They are not
committed here because they are binary artifacts.
