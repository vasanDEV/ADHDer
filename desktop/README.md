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
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++")
- WebView2 runtime (preinstalled on Windows 11)
- Python 3.11+ (to build the backend sidecar)
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

> **Quickest path:** run the automated build script from the repo root —
> `powershell -ExecutionPolicy Bypass -File scripts\build-windows-installer.ps1`
> (add `-SkipBackend` for fast frontend-only rebuilds). The manual steps below
> are what that script automates.

1. **Build the backend sidecar** with PyInstaller and copy it to
   `desktop/binaries/`, named with the Rust target triple (the `externalBin`
   entry in `tauri.conf.json`). Find your triple with `rustc -Vv` — on 64-bit
   Windows it is `x86_64-pc-windows-msvc`.

   ```powershell
   cd backend
   python -m venv .venv; .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt pyinstaller
   pyinstaller --name adhder-backend --onefile run_server.py
   mkdir ..\desktop\binaries -Force
   copy dist\adhder-backend.exe ..\desktop\binaries\adhder-backend-x86_64-pc-windows-msvc.exe
   ```

2. **Build the installer** (Tauri builds the frontend and Rust shell for you):

   ```powershell
   cd ..\desktop
   pnpm dlx @tauri-apps/cli build
   ```

   Output:

   | Format | Path |
   | ------ | ---- |
   | MSI (WiX)  | `target\release\bundle\msi\ADHDer_0.1.0_x64_en-US.msi` |
   | NSIS setup | `target\release\bundle\nsis\ADHDer_0.1.0_x64-setup.exe` |

   > In `tauri dev` the sidecar is **not** spawned (you run `uvicorn` yourself);
   > in packaged builds the shell launches the bundled `adhder-backend.exe`.

## Icons

Tauri requires icon assets referenced in `tauri.conf.json`. Generate them from a
single source PNG with:

```powershell
pnpm dlx @tauri-apps/cli icon path\to\logo.png
```

This writes `icons/` (32x32.png, 128x128.png, icon.ico, etc.). They are not
committed here because they are binary artifacts.
