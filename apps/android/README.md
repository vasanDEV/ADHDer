# ADHDer Android — Open in Android Studio & Emulate

This guide is for **Android Studio users** who want to run ADHDer on an emulator or device and keep iterating on the UI. You do **not** need to know Rust for day-to-day UI work. Rust business logic is already tested in CI/local with `cargo test`; the shared core lives under `/crates`.

**Visual reference:** `Designs/Figma_inspiration.png` (phone + tablet layouts). Product rules: `APP.md` / `DESIGN_SYSTEM.md`.

---

## 1. What you are opening

| Path | Role |
|------|------|
| `apps/android/` | React Native app (JS/TS UI) |
| `apps/android/android/` | Native Android Gradle project (open this in Android Studio) |
| `crates/` | Shared Rust core (SQLite + domain). Do not reimplement in JS. |
| `scripts/build-android-native.sh` | Builds `libadhder_android.so` for the app |

Stack (locked):

```
React Native UI → Kotlin bridge → Rust (adhder-android) → SQLite
```

If the Rust `.so` is missing, the app still launches with a **UI mock** banner so you can design screens. Build the native lib for real offline data.

---

## 2. Prerequisites

Install on your machine:

1. **Android Studio** (Ladybug / latest stable) with:
   - Android SDK 34+
   - Android SDK Build-Tools
   - **NDK** (side-by-side; version matching the project’s `ndkVersion` in `android/build.gradle`)
   - At least one **Virtual Device** (Pixel phone + optional tablet AVD)
2. **Node.js 18+** and npm
3. **Rust** (only required to build the native core):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
   ```
4. JDK 17 (Android Studio usually bundles one)

Set env vars (adjust paths for your OS):

```bash
# Linux example
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125   # use your installed NDK folder
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

---

## 3. Clone & install JS deps

```bash
git clone <your-fork-or-repo-url> ADHDer
cd ADHDer
git checkout android-build/v0.1

cd apps/android
npm install
```

---

## 4. Import into Android Studio

1. Open **Android Studio** → **File → Open**
2. Select the folder:  
   `ADHDer/apps/android/android`  
   (the Gradle project that contains `settings.gradle` / `app/`)
3. Let Gradle sync finish (first sync downloads dependencies)
4. If prompted for SDK/NDK, install the missing components from the banner

> Do **not** open the repo root as the Android project. Open `apps/android/android`.

Optional: also open the whole monorepo in Cursor/VS Code for TypeScript editing while Android Studio runs the emulator.

---

## 5. (Recommended) Build the Rust native library

From the **repo root**:

```bash
chmod +x scripts/build-android-native.sh
./scripts/build-android-native.sh
```

This compiles `adhder-android` with `cargo-ndk` and copies:

```
apps/android/android/app/src/main/jniLibs/<abi>/libadhder_android.so
```

Without this step, Settings will show “UI mock” and data is not persisted through Rust/SQLite.

---

## 6. Start Metro + run on emulator

**Terminal A** (JS bundler):

```bash
cd apps/android
npm start
```

**Terminal B** or Android Studio:

```bash
# Ensure an AVD is running (Device Manager → Play), then:
cd apps/android
npm run android
```

Or in Android Studio: select the emulator → press **Run** (green triangle) on the `app` configuration.

### Tablet layout check

Create a tablet AVD (e.g. Pixel Tablet) and run again. Navigation stays the same destinations; wider layouts are used where implemented (Kanban columns / planner). Phone uses bottom tabs + swipeable Kanban + planner bottom sheet per `APP.md`.

---

## 7. How to make further UI changes

| Change | Where to edit |
|--------|----------------|
| Screens (Dashboard, Focus, Tasks, …) | `apps/android/src/screens/` |
| Bottom navigation / icons | `apps/android/src/navigation/RootNavigator.tsx` |
| Colors, radii, type | `apps/android/src/theme/tokens.ts` |
| Calling Rust commands | `apps/android/src/bridge/adhder.ts` (`invoke('tasks.create', …)`) |
| Kotlin JNI transport only | `android/app/src/main/java/com/adhderandroid/bridge/` |

Workflow:

1. Edit TypeScript under `src/`
2. Save → Metro hot-reloads (shake device / `r` in Metro for reload)
3. Match spacing and calm monochrome + blue accent to `Designs/Figma_inspiration.png` and `DESIGN_SYSTEM.md`
4. **Do not** put Kanban rules, Pomodoro completion, or import validation in JS — call `invoke(...)` and keep logic in Rust

### Useful Rust commands (already implemented)

Examples:

- `tasks.list` / `tasks.create` / `tasks.move` / `tasks.set_focus`
- `pomodoro.prepare` / `start` / `pause` / `tick` / `reset`
- `planner.list` / `planner.create`
- `notes.list` / `notes.create` / `notes.update`
- `settings.get` / `settings.set` / `settings.export` / `settings.import`
- `stats.dashboard` / `search.query`

---

## 8. Rust testing (maintainers / agents)

You should not need this for UI polish. When changing domain behavior:

```bash
# From repo root
cargo test --workspace
```

All business correctness is covered here (tasks Kanban, pomodoro lifecycle, notes autosave payload, planner dates, backup/import safety, search, FFI JSON API).

After Rust changes that affect the Android `.so`:

```bash
./scripts/build-android-native.sh
# then rebuild the app in Android Studio / npm run android
```

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `SDK location not found` | Create `apps/android/android/local.properties` with `sdk.dir=/path/to/Android/Sdk` |
| `does not provide … JAVA_COMPILER` | Install a full JDK (not JRE). Prefer Android Studio’s embedded JBR, or `sudo apt install openjdk-17-jdk`. Set `JAVA_HOME` to that JDK, then re-run. |
| AsyncStorage / Kotlin version warnings | Don’t need AsyncStorage for v0.1; keep Kotlin at the RN template version |
| `libadhder_android.so` missing / mock banner | Run `./scripts/build-android-native.sh` with NDK installed |
| Metro port busy | `npx react-native start --reset-cache` |
| Emulator can’t reach Metro | Ensure `adb reverse tcp:8081 tcp:8081` |
| Gradle NDK mismatch | Install the NDK version from `android/build.gradle` via SDK Manager |
| App installs but white screen | Check Metro terminal for TS errors; confirm `index.js` → `App.tsx` |

---

## 10. Project map (Android v0.1)

```
ADHDer/
├── APP.md / DESIGN_SYSTEM.md / RUST_ARCHITECTURE.md / ANDROID_PLAN.md
├── Designs/Figma_inspiration.png
├── crates/                      # Rust workspace (tested)
│   ├── adhder-core|
│   ├── adhder-db|
│   ├── adhder-tasks|notes|pomodoro|planner|settings|stats|search
│   └── adhder-android           # JNI + JSON command API
├── scripts/build-android-native.sh
└── apps/android/                # React Native
    ├── App.tsx
    ├── src/screens|navigation|theme|bridge
    └── android/                 # ← open THIS in Android Studio
```

---

## 11. Product reminders for UI work

- Tasks = Kanban **To Do / Working / Finished** (phone: swipe columns) — not a Material list redesign
- Notes on Android = **rich text only** (no Markdown)
- Planner phone agenda = bottom sheet; keep chrome minimal
- One blue accent (`#2563EB`); outline icons; generous whitespace
- Offline-first; no login required for core use
