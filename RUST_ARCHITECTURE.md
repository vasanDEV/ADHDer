# ADHDer — Rust Architecture

**Status:** Canonical architecture documentation  
**Audience:** Rust engineers and AI coding agents  
**Rule:** Do not redesign the architecture, replace technologies, or suggest alternatives. The decisions below are final. Expand and implement within them.

---

## 1. Purpose

ADHDer’s shared Rust core is the single home for business logic. Desktop (Tauri v2) and Android (Kotlin / JNI) are delivery shells. SQLite is the durable source of truth. This document explains the **existing** architecture shape so every feature crate, bridge, and migration stays coherent.

---

## 2. Final decisions

| Decision | Why it exists |
|----------|----------------|
| Cargo workspace | One versioned graph; shared deps; feature isolation |
| Shared Rust core | Same rules on Windows and Android; no duplicated domain |
| SQLite | Offline-first, local, reliable, embeddable |
| SQLx | Compile-time checked queries where used; explicit async/sync control as configured |
| Repository pattern | Persistence behind interfaces; domain stays pure |
| Clean architecture | UI/bridges cannot leak into domain; testability |
| Event-driven | Cross-feature reactions without tight crate coupling |
| One crate per feature | Clear ownership, smaller blast radius, parallel work |

---

## 3. Workspace layout

```
crates/
├── adhder-core/       # kernel: IDs, errors, events, time, shared types
├── adhder-db/         # SQLite pool, migrations, shared SQL utilities
├── adhder-tasks/      # Tasks / Kanban
├── adhder-notes/      # Notes (storage + domain; editor format is client concern)
├── adhder-pomodoro/   # Focus sessions & timer domain
├── adhder-planner/    # Calendar / agenda
├── adhder-settings/   # Preferences, backup/import/export orchestration hooks
├── adhder-stats/      # Aggregated statistics
├── adhder-search/     # Local search indexes / queries
├── adhder-desktop/    # Tauri command wiring (or apps/desktop/src-tauri)
└── adhder-android/    # FFI exports for Kotlin / JNI
```

Exact package names may follow repo conventions; **responsibilities** must match.

### Why a workspace

- Features compile and test independently.
- Shared kernel prevents divergent error/event types.
- Desktop and Android link the same domain crates.

---

## 4. Clean architecture inside a feature crate

Typical layering (inside e.g. `adhder-tasks`):

```
public API (commands / queries)
        ↓
application (use cases)
        ↓
domain (entities, invariants)
        ↓
repository traits
        ↓
SQLx adapters (adhder-db)
```

### Why

- Use cases express product workflows from `APP.md` without UI frameworks.
- Domain invariants (e.g., Kanban column values) cannot be bypassed by a client bug.
- Repositories allow testing with fakes; production uses SQLite.

---

## 5. Crate responsibilities

### 5.1 `adhder-core`

- Shared IDs, timestamps, pagination types
- Error taxonomy (`Domain`, `NotFound`, `Conflict`, `Storage`, …)
- Event definitions and bus traits / publish helpers
- Clock / RNG abstractions for tests

**Why:** One language for failures and events across features.

### 5.2 `adhder-db`

- Connection / pool lifecycle
- Migrations
- Shared SQL helpers
- Transaction helpers

**Why:** Schema evolution and connection policy stay centralized; features do not open ad-hoc DB handles.

### 5.3 `adhder-tasks`

- Task entity, priority, Kanban column: **To Do**, **Working**, **Finished**
- Create / update / move / list / delete use cases
- Current-focus designation used by Dashboard

**Why:** Task workflow is a bounded context with clear states.

### 5.4 `adhder-notes`

- Note and folder entities
- CRUD, organization, autosave-oriented update APIs
- Content stored as opaque structured payload suitable for:
  - Desktop Markdown documents
  - Android rich-text documents  
  Editor format is a **client** concern; core stores and retrieves content reliably and may store a `format` discriminator if needed for multi-platform safety.

**Why:** Shared note identity and sync/search readiness without forcing one editor onto all platforms.

### 5.5 `adhder-pomodoro`

- Session configuration, start / pause / resume / complete
- Progress and completion events
- Contribution to statistics

**Why:** Timing and session integrity must not diverge between UI clocks.

### 5.6 `adhder-planner`

- Calendar day selection models
- Agenda items tied to dates
- Create / list / update planned entries

**Why:** Planner is date-centric; keep it separate from Kanban task state machines.

### 5.7 `adhder-settings`

- Typed preferences
- Backup / export / import orchestration (file IO may sit at bridge boundary; validation and apply logic in Rust)
- Notification preference flags

**Why:** Data safety rules (especially import) belong in one place.

### 5.8 `adhder-stats`

- Aggregations for Dashboard and Pomodoro summaries
- Read models updated via events or explicit recompute

**Why:** Keeps analytical queries out of UI and out of unrelated feature crates.

### 5.9 `adhder-search`

- Local indexing and query APIs over notes/tasks/planner content as implemented
- Incremental update hooks via events

**Why:** Search is cross-cutting but still offline and local.

---

## 6. Public vs internal APIs

### Public (stable for bridges)

- Command / query functions or service structs intended for Tauri and JNI
- DTOs that are FFI-friendly (or explicitly serialized)
- Error codes stable enough for UI mapping

### Internal

- Repository implementations
- SQL
- Domain helpers
- Event handlers not exposed to UI

**Rule:** Bridges call public APIs only. UI never imports internal modules via unsafe paths.

### Why

- Android and Desktop stay interchangeable at the use-case boundary.
- Refactors inside a crate do not break FFI churn unnecessarily.

---

## 7. Database

- Engine: **SQLite**
- Access: **SQLx**
- Ownership: migrations in `adhder-db` (or equivalent single migration authority)
- Feature tables owned by feature crates’ repository modules, registered through central migrations

### Why SQLite

- Offline-first by default
- Single-file backup/export friendliness
- Predictable local performance
- No network dependency for core CRUD

### Transactions

- Multi-table updates (e.g., import apply, move + stats) run in transactions
- Failed import must roll back cleanly (see Settings / data safety)

---

## 8. Repositories

Each feature defines repository traits in application/domain space and implements them with SQLx.

Example responsibilities:

| Repository | Examples |
|------------|----------|
| TasksRepo | insert, update, set_column, list_by_column |
| NotesRepo | insert, update_content, list_by_folder |
| PomodoroRepo | insert_session, complete_session |
| PlannerRepo | list_for_date, upsert_item |
| SettingsRepo | get/set preferences |

**Why:** Domain tests mock traits; production code hits SQLite without changing use cases.

---

## 9. Events

Event-driven integration between crates.

Examples (illustrative of the pattern; names follow implementation):

- `TaskMoved { id, from, to }`
- `TaskFocusChanged { id }`
- `PomodoroCompleted { session_id, task_id? }`
- `NoteUpserted { id }`
- `SettingsChanged { key }`

Subscribers: stats refresh, search reindex, notification scheduling hooks.

**Why:** Avoids `adhder-tasks` depending on `adhder-stats` internals. Features publish; interested crates subscribe.

---

## 10. Error handling

- Typed errors in `adhder-core` + feature-specific variants
- Map to bridge-level codes at FFI/Tauri edges
- Storage errors never appear as empty successful UI states
- Validation errors are expected and actionable

**Why:** Thin clients need stable, mappable failures; domain needs rich internal context.

---

## 11. Threading

- Database access confined to patterns established in `adhder-db` (pool, async runtime as chosen for Tauri / mobile)
- UI threads never run heavy SQL
- Pomodoro completion and notifications coordinated without blocking UI
- FFI calls are short; long work uses explicit async/worker patterns already adopted by the workspace

**Why:** Mobile ANRs and desktop jank both come from blocking the UI on IO.

---

## 12. Caching

- Optional read-through caches for hot read models (stats, current focus) invalidated via events
- SQLite remains authoritative; cache is never a second source of truth
- Keep caches small and explicit

**Why:** Dashboard and timer UIs want instant reads without sacrificing durability.

---

## 13. Feature domains (behavioral contracts)

### Tasks

- Columns: **To Do**, **Working**, **Finished** only
- Priority stored as a discrete field; UI shows a small indicator
- Moves emit events for stats/search

### Notes

- Folders + notes
- Autosave = frequent `update_content` style commands from clients
- Format: clients send Markdown (Desktop) or rich-text document JSON/model (Android); core persists without requiring Android Markdown

### Pomodoro

- Session lifecycle owned by Rust
- Completion updates stats and may signal notification layer

### Planner

- Date-keyed agenda operations
- Independent of Kanban columns (linking to tasks allowed if already part of product behavior)

### Settings

- Preferences
- Backup / export produce artifacts; import validates then applies transactionally

### Statistics & Search

- Derived; rebuildable; event-driven updates preferred

---

## 14. Desktop bridge (Tauri v2)

```
React UI → Tauri invoke → Rust commands → feature use cases → SQLite
```

- Each command maps to a public use case
- Serialization at the boundary (serde)
- No domain logic in TypeScript

**Why:** Tauri keeps a thin, fast desktop shell while Rust remains authoritative.

---

## 15. Android bridge (JNI / Kotlin)

```
React Native → Kotlin bridge → JNI/FFI → Rust → SQLite
```

- Kotlin is transport and platform integration (notifications, file pickers)
- React Native renders; does not own domain
- Same use cases as Desktop wherever possible

**Why:** One core, two shells; Android-specific only at the edges (permissions, FCM/local notifications, SAF, etc.).

---

## 16. Future crates (not shipped)

Documented for expansion planning. Do not treat as current features.

| Crate (planned) | Role | Constraint |
|-----------------|------|------------|
| `adhder-ai` | Assistive features over local data | Additive; no mandatory cloud for core app |
| `adhder-sync` | Optional multi-device sync | Offline-first remains default |
| `adhder-ocr` | Image → text capture pipelines | Writes into existing Notes/Tasks models |
| `adhder-voice` | Voice → commands / capture | Invokes existing public APIs |

**Why document now:** So future work extends the workspace instead of forking architecture.

---

## 17. Testing

- Domain unit tests per crate
- Repository integration tests against SQLite
- Event handler tests
- Migration tests (up / up+data integrity)
- Bridge smoke tests on Desktop and Android as available

Business correctness is proven in Rust first.

---

## 18. Related documents

| Document | Role |
|----------|------|
| `AGENTS.md` | Engineering handbook & AI rules |
| `APP.md` | Product behavior |
| `DESIGN_SYSTEM.md` | UI identity (clients only) |

**Conflict resolution:** This file + `AGENTS.md` govern Rust structure and stack. Product workflows defer to `APP.md`. Presentation defers to `DESIGN_SYSTEM.md`.
