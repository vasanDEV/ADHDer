# ADHDer

Offline-first productivity app (Pomodoro, Tasks, Planner, Notes).

| Doc | Purpose |
|-----|---------|
| [`APP.md`](./APP.md) | Product requirements |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual language |
| [`AGENTS.md`](./AGENTS.md) | Engineering handbook |
| [`RUST_ARCHITECTURE.md`](./RUST_ARCHITECTURE.md) | Rust core layout |
| [`ANDROID_PLAN.md`](./ANDROID_PLAN.md) | Android delivery plan |
| [`apps/android/README.md`](./apps/android/README.md) | **Android Studio: import, emulate, iterate** |

## Android v0.1 (this branch)

```bash
# Rust domain tests
cargo test --workspace

# Android UI
cd apps/android && npm install && npm start
# In another terminal (emulator running):
npm run android
```

Build the Rust `.so` before expecting real SQLite persistence:

```bash
./scripts/build-android-native.sh
```

See [`apps/android/README.md`](./apps/android/README.md) for full Android Studio instructions.
