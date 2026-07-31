# ADHDer — Engineering Handbook (AGENTS.md)

**Status:** Canonical engineering handbook for humans and AI coding agents  
**Audience:** Cursor, Claude Code, and future automated agents  
**Rule:** Architecture, stack, design philosophy, and product direction are **final**. Do not redesign, replace technologies, or propose alternate architectures.

---

## 1. Project

| Field | Value |
|-------|-------|
| Application name | ADHDer |
| Canonical implementation | Windows Desktop |
| Mobile adaptation | Android phones & Samsung / Android tablets |
| Future | iPad, macOS |

Android must preserve the same product identity as Windows. Visual language: see `DESIGN_SYSTEM.md`. Product behavior: see `APP.md`. Rust core: see `RUST_ARCHITECTURE.md`.

---

## 2. Engineering philosophy

1. **Rust owns business logic** — Validation, workflows, persistence rules, statistics, search indexing, and domain events live in Rust only.
2. **Clients are thin** — React (Desktop) and React Native (Android) render state and dispatch commands. They do not reimplement domain rules.
3. **SQLite is the single source of truth** — Local-first; offline is the default mode of operation.
4. **Windows is canonical UX** — Android adapts layout for touch; it does not become Material You or a different product.
5. **One workspace, many feature crates** — Features stay isolated; shared contracts stay explicit.
6. **Additive futures** — Sync, AI, OCR, Voice arrive as new crates/capabilities, never as a rewrite of the core.

---

## 3. Technology stack (final)

### Desktop

```
React + TypeScript
        ↓
    Tauri v2
        ↓
    Rust Core
        ↓
     SQLite
```

### Android

```
React Native
        ↓
  Kotlin Bridge
        ↓
    Rust Core
        ↓
     SQLite
```

### Locked decisions

| Decision | Status |
|----------|--------|
| Tauri v2 | Final |
| React + TypeScript (Desktop) | Final |
| React Native (Android) | Final |
| Kotlin bridge (Android) | Final |
| Shared Rust core | Final |
| SQLite + SQLx | Final |
| Offline first | Final |
| Cargo workspace + feature crates | Final |

Do not replace any of the above. Do not move business logic into TypeScript, Kotlin, or React Native.

---

## 4. Layer responsibilities

| Layer | Responsibility | Must not |
|-------|----------------|----------|
| React / React Native UI | Screens, navigation, presentation, local UI state | Domain rules, SQL, cross-feature business workflows |
| Tauri commands (Desktop) | IPC boundary to Rust | Duplicate domain logic in TS |
| Kotlin bridge (Android) | JNI / FFI boundary to Rust | Domain logic in Kotlin |
| Rust application / domain | Use cases, validation, events, orchestration | UI widgets, platform chrome |
| Rust repositories | Persistence via SQLx / SQLite | UI knowledge |
| SQLite | Durable local data | — |

### Dependency rules

- UI → bridges → Rust public API → domain → repositories → SQLite
- Lower layers never depend on UI frameworks
- Feature crates do not reach into another feature’s internals; they use public APIs / events
- Android and Desktop call the **same** Rust use cases where possible

---

## 5. Repository layout (expected)

High-level shape (names may vary slightly; responsibilities must not):

```
ADHDer/
├── APP.md
├── DESIGN_SYSTEM.md
├── AGENTS.md
├── RUST_ARCHITECTURE.md
├── apps/
│   ├── desktop/          # React + Tauri v2
│   └── android/          # React Native + Kotlin bridge
└── crates/               # Cargo workspace
    ├── adhder-core/      # shared kernel, errors, events
    ├── adhder-db/        # SQLite / SQLx / migrations
    ├── adhder-tasks/
    ├── adhder-notes/
    ├── adhder-pomodoro/
    ├── adhder-planner/
    ├── adhder-settings/
    ├── adhder-stats/
    ├── adhder-search/
    └── …                 # future: sync, ai, ocr, voice
```

Every product feature is its own crate (or clearly bounded module evolving into a crate). See `RUST_ARCHITECTURE.md` for crate APIs and events.

---

## 6. Coding standards

### 6.1 TypeScript / React (Desktop)

- UI only: composition, routing, view-models that map DTO ↔ props
- Call Tauri commands; do not embed SQL or domain branching beyond presentation
- Follow `DESIGN_SYSTEM.md` (whitespace, monochrome + blue accent, outline icons)
- Prefer clarity over cleverness

### 6.2 React Native (Android)

- Same rule: no business logic
- Adapt layouts (bottom nav, sheets, swipeable Kanban) per `APP.md` / `DESIGN_SYSTEM.md`
- Notes editor is **rich text only** — no Markdown on Android
- Do not introduce Material Design as a new identity system

### 6.3 Kotlin bridge

- Thin FFI/JNI wrappers around Rust exports
- Map errors to structured bridge errors
- No domain reimplementation

### 6.4 Rust

- Clean architecture: domain → application → infrastructure
- Repository pattern for persistence
- Explicit error types; no silent failure
- Feature crates expose small public APIs
- Event-driven notifications for cross-feature reactions
- SQLx + SQLite only for primary storage

---

## 7. AI coding rules (mandatory)

When generating or editing code, agents **must**:

1. Preserve the stack above — no Electron swap, no Room-only Android domain, no cloud-required core paths.
2. Keep business logic in Rust.
3. Match Windows visual identity; adapt layout only.
4. Respect Notes split: **Desktop Markdown / Android rich text**.
5. Keep Kanban columns: **To Do**, **Working**, **Finished**.
6. Prefer extending existing crates over inventing parallel systems.
7. Not redesign product modules or invent features outside `APP.md`.
8. Not “helpfully” convert the UI to Material You.
9. Treat Sync / AI / OCR / Voice as **future** additive work unless explicitly tasked.
10. Read `APP.md`, `DESIGN_SYSTEM.md`, and `RUST_ARCHITECTURE.md` before large changes.

When uncertain, choose the option that keeps offline-first Rust + SQLite intact and the Windows UX recognizable.

---

## 8. Feature development workflow

Standard order for any feature change:

1. **Domain / Rust** — model, use cases, repository methods, migrations, events, tests  
2. **Public Rust API** — stable command/query surface for bridges  
3. **Desktop bridge** — Tauri commands  
4. **Android bridge** — Kotlin / JNI bindings  
5. **Desktop UI** — React screens matching Windows patterns  
6. **Android UI** — React Native adaptations  
7. **Docs** — update `APP.md` / design / architecture if behavior meaningfully changes  

Never start by encoding business rules only in the UI.

---

## 9. Performance guidelines

- Cold start and navigation must feel instant on mid-range Android and typical Windows hardware
- SQLite queries stay indexed and scoped; avoid full-table scans on hot paths
- UI lists virtualize when data grows
- Autosave is debounced enough to stay smooth, durable enough to avoid loss
- Pomodoro timer UI remains light; timing authority stays correct in Rust / platform services as designed
- No unnecessary bridge chatter — batch or query intentionally

---

## 10. Testing philosophy

| Layer | Focus |
|-------|-------|
| Rust unit / integration | Domain rules, repositories, migrations, events |
| Bridge smoke | Commands round-trip; errors map cleanly |
| UI | Critical flows; visual regression only where valuable |
| Manual | Offline behavior, autosave, backup/import/export |

Prefer fast Rust tests for business correctness. UI tests do not replace domain tests.

---

## 11. Logging

- Structured, leveled logs in Rust for domain and persistence
- Bridges log boundary failures with correlation-friendly messages
- UI logs presentation issues only — not domain traces duplicated in three languages
- Never log secrets or full backup payloads

---

## 12. Error handling

- Rust returns typed errors; map to stable error codes/messages at bridge boundaries
- UI shows calm, actionable messages (per design system — not alarming chrome)
- Import / backup failures must not corrupt existing SQLite state
- Prefer recoverable paths; crash only on programmer invariants

---

## 13. Product modules (for implementation mapping)

| Module | Notes |
|--------|-------|
| Dashboard | Clock, date, current focus, minimal stats |
| Pomodoro | Large timer, thin ring, minimal controls, stats |
| Tasks | Kanban: To Do / Working / Finished |
| Planner | Calendar + agenda (sheet / side / right panel by device) |
| Notes | Desktop Markdown; Android rich text (Bold, Italic, Underline, Bullets, Numbered, Checklist, Tables) |
| Settings | Preferences, Backup, Import, Export, Notifications |

---

## 14. Future expansion

Additive only — new crates and bridges, not stack replacements:

- **Sync** — optional; offline remains default  
- **AI** — assistive; local data ownership preserved  
- **OCR** — capture pipeline into existing Notes/Tasks models  
- **Voice** — input channel into existing commands  
- **iPad / macOS** — new shells over the same Rust core  

Do not weaken the shared core to ship a future feature faster.

---

## 15. Related documents

| Document | Role |
|----------|------|
| `APP.md` | Product requirements & workflows |
| `DESIGN_SYSTEM.md` | Visual language |
| `RUST_ARCHITECTURE.md` | Crate layout, APIs, DB, events |

**Conflict resolution:** Architecture and stack in this file and `RUST_ARCHITECTURE.md` win for engineering. Windows behavior + `APP.md` win for product. `DESIGN_SYSTEM.md` wins for presentation detail.
