<#
.SYNOPSIS
    Build the ADHDer Windows installer end-to-end.

.DESCRIPTION
    Automates every step needed to produce the .msi / .nsis installers:
      1. Builds the Python backend into a single-file sidecar (PyInstaller) and
         copies it into desktop/binaries with the correct Rust target triple.
      2. Generates app icons if they are missing (from -SourceIcon, or a
         generated placeholder).
      3. Runs `tauri build`, which builds the frontend and compiles the shell.

    Run it again after changes. For frontend-only tweaks, pass -SkipBackend to
    avoid rebuilding the (slow) Python sidecar.

.PARAMETER SkipBackend
    Skip rebuilding the Python sidecar (reuse the existing binaries/*.exe).
    Use this for fast frontend-only iterations.

.PARAMETER SkipIcons
    Never (re)generate icons even if they are missing.

.PARAMETER SourceIcon
    Path to a square PNG (>= 512x512) used to generate the app icon set.

.PARAMETER Bundle
    Which installers to produce: both (default), msi, or nsis.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\build-windows-installer.ps1

.EXAMPLE
    # fast rebuild after only touching frontend code
    powershell -ExecutionPolicy Bypass -File scripts\build-windows-installer.ps1 -SkipBackend
#>
[CmdletBinding()]
param(
    [switch]$SkipBackend,
    [switch]$SkipIcons,
    [string]$SourceIcon,
    [ValidateSet('both', 'msi', 'nsis')]
    [string]$Bundle = 'both'
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# --- Resolve paths (script lives in <repo>/scripts) ---------------------------
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$desktop = Join-Path $root 'desktop'
$binaries = Join-Path $desktop 'binaries'
$iconDir = Join-Path $desktop 'icons'

# --- Prerequisite checks ------------------------------------------------------
Write-Step 'Checking prerequisites'
foreach ($tool in 'pnpm', 'cargo', 'rustc') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Fail "'$tool' is not on PATH. See README.md (Prerequisites / Troubleshooting)."
    }
}
Write-Info "pnpm  : $(pnpm --version)"
Write-Info "cargo : $((cargo --version))"

# Determine the Rust target triple (used for the sidecar file name).
$hostLine = & rustc -Vv | Where-Object { $_ -match '^host:' } | Select-Object -First 1
if ($hostLine) { $triple = ($hostLine -replace 'host:\s*', '').Trim() }
if ([string]::IsNullOrWhiteSpace($triple)) { $triple = 'x86_64-pc-windows-msvc' }
Write-Info "target: $triple"

# --- 1. Backend sidecar -------------------------------------------------------
$sidecar = Join-Path $binaries "adhder-backend-$triple.exe"

if ($SkipBackend) {
    Write-Step 'Skipping backend sidecar (-SkipBackend)'
    if (-not (Test-Path $sidecar)) {
        Fail "No sidecar at '$sidecar'. Run once without -SkipBackend first."
    }
}
else {
    Write-Step 'Building backend sidecar (PyInstaller)'
    Push-Location $backend
    try {
        if (-not (Test-Path '.venv')) {
            Write-Info 'Creating virtualenv (.venv)'
            # Prefer Python 3.12 — some pinned deps have no wheels for 3.14.
            if (Get-Command py -ErrorAction SilentlyContinue) {
                & py -3.12 -m venv .venv
            }
            else {
                & python -m venv .venv
            }
        }
        $venvPy = Join-Path $backend '.venv\Scripts\python.exe'
        if (-not (Test-Path $venvPy)) { Fail "virtualenv python not found at $venvPy" }

        Write-Info 'Installing backend deps + pyinstaller'
        & $venvPy -m pip install --upgrade pip | Out-Null
        & $venvPy -m pip install -r requirements.txt pyinstaller | Out-Null

        Write-Info 'Packaging backend -> dist\adhder-backend.exe'
        & $venvPy -m PyInstaller --name adhder-backend --onefile --noconfirm `
            --distpath dist --workpath build --specpath build run_server.py
        if ($LASTEXITCODE -ne 0) { Fail 'PyInstaller failed.' }
    }
    finally { Pop-Location }

    New-Item -ItemType Directory -Force -Path $binaries | Out-Null
    Copy-Item (Join-Path $backend 'dist\adhder-backend.exe') $sidecar -Force
    Write-Info "Sidecar -> $sidecar"
}

# --- 2. Icons (only if missing, unless -SourceIcon is given) ------------------
$iconIco = Join-Path $iconDir 'icon.ico'
$needIcons = (-not $SkipIcons) -and ($SourceIcon -or -not (Test-Path $iconIco))

if ($needIcons) {
    Write-Step 'Generating app icons'
    $src = $SourceIcon
    if (-not $src) {
        Write-Info 'No -SourceIcon given; generating a placeholder logo'
        $src = Join-Path $env:TEMP 'adhder-logo.png'
        try {
            Add-Type -AssemblyName System.Drawing
            $sz = 1024
            $bmp = New-Object System.Drawing.Bitmap $sz, $sz
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 122, 255))
            $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 44
            $m = 230
            $g.DrawEllipse($pen, $m, $m, ($sz - 2 * $m), ($sz - 2 * $m))
            $c = $sz / 2
            $g.DrawLine($pen, $c, $c, $c, ($c - 250))   # minute hand
            $g.DrawLine($pen, $c, $c, ($c + 170), $c)   # hour hand
            $g.Dispose()
            $bmp.Save($src, [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Dispose()
        }
        catch {
            Fail "Could not generate a placeholder icon ($($_.Exception.Message)). Re-run with -SourceIcon <path-to-square.png> or -SkipIcons."
        }
    }
    Push-Location $desktop
    try {
        & pnpm dlx @tauri-apps/cli icon $src
        if ($LASTEXITCODE -ne 0) { Fail 'tauri icon generation failed.' }
    }
    finally { Pop-Location }
}
else {
    Write-Step 'Icons present — skipping generation'
}

# --- 3. Build the installer ---------------------------------------------------
Write-Step 'Building installer (tauri build)'
Push-Location $desktop
try {
    $buildArgs = @('dlx', '@tauri-apps/cli', 'build')
    if ($Bundle -ne 'both') { $buildArgs += @('--bundles', $Bundle) }
    & pnpm @buildArgs
    if ($LASTEXITCODE -ne 0) { Fail 'tauri build failed (see output above).' }
}
finally { Pop-Location }

# --- Report artifacts ---------------------------------------------------------
Write-Step 'Done — installers produced'
$bundleDir = Join-Path $desktop 'target\release\bundle'
if (Test-Path $bundleDir) {
    Get-ChildItem -Path $bundleDir -Recurse -Include *.msi, *-setup.exe -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Green }
}
else {
    Write-Info "Expected output under $bundleDir"
}
