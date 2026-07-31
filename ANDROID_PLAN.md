# ADHDer — Android Development Plan

**Status:** v0.1 implementation in progress on `android-build/v0.1`  
**Audience:** Engineering and AI coding agents  
**Base documents:** `APP.md`, `DESIGN_SYSTEM.md`, `AGENTS.md`, `RUST_ARCHITECTURE.md`  
**Visual reference:** `Designs/Figma_inspiration.png`, `Designs/app_icon.png`

This plan scopes the Android Phone + Tablet adaptation of ADHDer against the locked stack. It does not invent features outside `APP.md` or replace the architecture in `RUST_ARCHITECTURE.md`.

---

## 1. Current state

| Asset | Status on `android-build/v0.1` |
|-------|------------------|
| Product / design / architecture docs | Present and canonical |
| Design inspiration + app icon | Present under `Designs/` |
| `apps/android/` (React Native) | **Scaffolded v0.1** — screens + Kotlin bridge |
| `crates/` Cargo workspace + Rust core | **Implemented** — tests via `cargo test --workspace` |
| Android Studio guide | `apps/android/README.md` |

Historical Windows work exists on `windows-build/v1.0` / `cursor/build-adhder-app-d624` (Tauri shell + React UI + **Python FastAPI** backend). That stack is **not** the target. Android must be built on the locked architecture:

```
React Native → Kotlin bridge → Rust core → SQLite
```

**Implication:** Android cannot ship as a thin UI over the old Python API. Shared Rust domain, DB, and public APIs are prerequisites for a durable Android shell. Prefer implementing the Rust workspace first (or in lockstep with Desktop), then Android bridge + UI.

---

## 2. Goals and non-goals

### Goals

1. Ship Android Phone and Android Tablet / Samsung Tablet as the same product identity as Windows.
2. Keep all business logic in Rust; RN/Kotlin stay thin.
3. Full offline core: Dashboard, Pomodoro, Tasks, Planner, Notes, Settings (backup / import / export / notifications).
4. Touch-adapted layouts per form factor; visual language from `DESIGN_SYSTEM.md`.
5. Notes on Android: **rich text only** (no Markdown).

### Non-goals (out of scope for this plan)

- Material You / Material Design identity rewrite
- Sync, AI, OCR, Voice (future additive crates only)
- iPad / macOS shells
- Moving domain rules into TypeScript or Kotlin
- Redesigning modules beyond `APP.md`

---

## 3. Locked constraints (must not drift)

| Constraint | Source |
|------------|--------|
| React Native + Kotlin JNI/FFI + shared Rust + SQLite/SQLx | `AGENTS.md` / `RUST_ARCHITECTURE.md` |
| Kanban columns: **To Do**, **Working**, **Finished** only | `APP.md` |
| Phone: bottom nav; Tablet: navigation rail | `APP.md` / `DESIGN_SYSTEM.md` |
| Phone Tasks: horizontally swipeable Kanban | `APP.md` |
| Tablet Tasks: three columns visible | `APP.md` |
| Planner phone: agenda as bottom sheet; tablet: side panel | `APP.md` |
| Android Notes: Bold, Italic, Underline, Bullets, Numbered, Checklist, Tables | `APP.md` |
| Accent: single blue; monochrome surfaces; outline icons | `DESIGN_SYSTEM.md` |
| Rounded active nav selection (desktop identity) | `APP.md` / `DESIGN_SYSTEM.md` |
| Settings: Preferences, Backup, Import, Export, Notifications | `APP.md` |

### Figma inspiration vs canonical docs

`Designs/Figma_inspiration.png` is a useful layout mood board. Where it conflicts with docs, **docs win**:

| Figma inspiration | Canonical decision |
|-------------------|--------------------|
| Phone Tasks as filtered vertical lists | Phone Tasks = **swipeable Kanban** (To Do / Working / Finished) |
| Dense filters (All / Today / Tomorrow / Overdue) as primary Tasks chrome | Do not invent filter UX not in `APP.md`; keep Kanban primary |
| Notes as Keep-style card grid as the only Notes surface | Notes = folders/list → editor; tablet may split panes |
| Settings absent from primary destinations | Settings remains a first-class module (primary or secondary entry) |
| Extra semantic rainbow as general UI color system | Monochrome + **one blue accent**; priority = small indicators only |
| Inter as system type in the board | Prefer calm, legible type that matches Windows identity; do not treat the board’s font choice as a stack mandate |

Use Figma for spacing feel, Pomodoro ring spirit, calendar hierarchy, and tablet multi-pane composition — not as a license to change IA.

---

## 4. Target architecture

```
apps/android/                    # React Native app (phone + tablet)
  ├── src/                       # Screens, navigation, presentation only
  └── android/                   # Native Android project
        └── app/.../bridge/      # Kotlin: JNI/FFI, notifications, SAF, timers

crates/
  ├── adhder-core/
  ├── adhder-db/
  ├── adhder-tasks/
  ├── adhder-notes/
  ├── adhder-pomodoro/
  ├── adhder-planner/
  ├── adhder-settings/
  ├── adhder-stats/
  ├── adhder-search/
  └── adhder-android/            # Public FFI exports for Kotlin
```

### Layer rules

| Layer | Owns | Must not own |
|-------|------|--------------|
| React Native | Screens, nav, gestures, rich-text editor UI, local UI state | SQL, Kanban rules, session integrity, import validation |
| Kotlin | JNI calls, permissions, local notifications, file pickers (SAF), foreground/background timer hooks | Domain branching |
| `adhder-android` | Stable FFI surface mapping to feature use cases | UI knowledge |
| Feature crates | Use cases, validation, events, repositories | RN components |
| SQLite | Durable state | — |

Dependency direction: **UI → Kotlin → Rust public API → domain → repositories → SQLite**.

---

## 5. Form-factor UX map

| Module | Phone | Tablet |
|--------|-------|--------|
| Navigation | Bottom navigation; rounded blue selection | Navigation rail; same selection language |
| Dashboard | Centered clock / date / current focus / sparse stats | Same composition; more whitespace, not more widgets |
| Pomodoro | Large thin ring + timer + Start; calm controls | Same; larger canvas |
| Tasks | One column primary; horizontal swipe across To Do / Working / Finished; touch move | Three columns simultaneous; touch drag / move |
| Planner | Calendar primary; agenda **bottom sheet** | Calendar + **side panel** agenda |
| Notes | List/folders → single editor; subtle rich-text toolbar; preview toggle with calm animation if used | Split: Folders \| Editor (\| Preview) when width allows |
| Settings | Full-screen stack; Backup / Import / Export / Notifications | Same modules; possibly two-pane prefs list + detail |
| Create affordance | Single FAB where desktop primary-create maps | Inline / header create preferred; avoid FAB clusters |

Deep links from notifications should open Pomodoro (or relevant module) when possible.

---

## 6. Platform edge cases (Android-specific)

These are shell concerns; domain still lives in Rust.

1. **Pomodoro backgrounding** — Session semantics must survive app background via system-appropriate timers + optional notification; UI clock is display-only.
2. **Notifications** — Opt-in; request runtime permission; respect Settings flags from Rust; calm copy only.
3. **Backup / Import / Export** — Use Storage Access Framework for user-controlled files; Kotlin handles IO bytes/paths; Rust validates and applies import transactionally.
4. **Autosave** — Debounced `update_content` (and similar) commands; never rely on an explicit Save for routine edits.
5. **DB location** — App-private SQLite path owned by `adhder-db` init from Android; backup operates on that store without corrupting on failed import.
6. **Configuration changes** — Phone rotation and foldables: preserve nav pattern rules; tablet landscape ≈ lightweight desktop organization.
7. **ANR avoidance** — No heavy SQL on UI thread; FFI calls short; long work on workers/async patterns established in the workspace.

---

## 7. Shared Rust prerequisites (block Android correctness)

Implement before or as hard gates for Android feature slices:

### Phase R0 — Workspace skeleton

- Cargo workspace with crate layout from `RUST_ARCHITECTURE.md`
- `adhder-core` errors, IDs, time, events
- `adhder-db` pool + migrations authority
- CI: `cargo test` for core/db

### Phase R1 — Feature crates (public use cases)

Order optimized for vertical slices Android can consume:

1. **`adhder-settings`** — preferences + notification flags (needed early for shell)
2. **`adhder-tasks`** — CRUD, move column, current focus
3. **`adhder-pomodoro`** — session lifecycle + completion events
4. **`adhder-stats`** — dashboard / pomodoro read models via events
5. **`adhder-planner`** — date agenda CRUD
6. **`adhder-notes`** — folders/notes; opaque content + `format` discriminator (`rich_text` vs `markdown`)
7. **`adhder-settings` data plane** — backup / export / import orchestration
8. **`adhder-search`** — incremental indexing hooks (can trail UI v1 if queries are scoped lists first)

### Phase R2 — Android FFI crate

- `adhder-android`: C ABI / UniFFI-style exports (exact FFI tech chosen within JNI-friendly options; do not invent a second domain API)
- JSON or explicit DTO serialization at boundary
- Stable error codes for Kotlin → RN mapping
- Smoke tests that exercise commands against on-disk SQLite

**Rule:** Desktop Tauri commands and Android FFI must call the **same** use cases.

---

## 8. Android app delivery phases

### Phase A0 — App shell

- Bootstrap `apps/android` React Native project
- Kotlin module wiring to load Rust (`adhder-android`)
- Design tokens: neutrals, single blue accent, radii, spacing, outline icon set
- Navigation:
  - Phone: bottom tabs — Dashboard, Pomodoro, Tasks, Planner, Notes (+ Settings entry)
  - Tablet: navigation rail with same destinations
- Safe-area / window-size breakpoints for phone vs tablet layouts
- App icon from `Designs/app_icon.png`

**Exit criteria:** Empty screens navigate; Rust hello/init opens SQLite successfully on device/emulator.

### Phase A1 — Dashboard + Tasks

- Dashboard: analog + digital clock, date, current focus, sparse stats from Rust
- Tasks Kanban phone swipe + tablet three-column
- Create / edit / move / delete via bridge
- Current focus set/clear

**Exit criteria:** Full To Do → Working → Finished flow offline; Dashboard reflects focus/stats.

### Phase A2 — Pomodoro + notifications

- Timer UI (thin ring, large type, Start / Pause / Reset)
- Rust owns session; Kotlin owns background/alarm/notification hooks
- Completion → stats + optional notification + deep link

**Exit criteria:** Session survives background; completion correct after kill/reopen per designed semantics.

### Phase A3 — Planner

- Month calendar, day selection
- Phone agenda bottom sheet; tablet side panel
- Create/open agenda items via Rust

**Exit criteria:** Select day → agenda updates; empty day is quiet.

### Phase A4 — Notes (Android rich text)

- Folders + list
- Editor with Bold, Italic, Underline, Bullets, Numbered, Checklist, Tables
- Persist rich-text document model (not Markdown) with format discriminator
- Debounced autosave
- Tablet split panes when width allows
- Calm preview toggle animation only if product uses preview for rich text

**Exit criteria:** Create/edit/reopen notes offline; no Markdown editor chrome on Android.

### Phase A5 — Settings + data portability

- Preferences persistence
- Notifications toggles + OS permission gate
- Backup / Export / Import via SAF + Rust validation/apply
- Calm error surfaces; failed import does not wipe DB

**Exit criteria:** Backup round-trip; bad import rejected safely.

### Phase A6 — Hardening

- List virtualization where needed
- Bridge batching; reduce chatter
- Structured logging at Kotlin/Rust boundaries (no secrets / full backups)
- Crash-free session pass on mid-range phone + Samsung tablet
- Manual checklist: offline, autosave, backup/import/export, Pomodoro background

---

## 9. Suggested vertical-slice order (engineering sequence)

Standard feature order from `AGENTS.md`, applied to Android:

```
Rust domain → Rust public API → Kotlin/JNI → React Native UI → docs touch-up
```

Practical milestone sequence:

1. R0 + R2 init + A0 shell (prove FFI + SQLite on device)
2. R1 tasks/stats + A1 Dashboard/Tasks
3. R1 pomodoro + A2 timer/notifications
4. R1 planner + A3
5. R1 notes + A4 rich text
6. R1 settings data plane + A5
7. A6 hardening (+ search if not already needed for Notes list)

Do **not** start by encoding Kanban, Pomodoro completion, or import rules only in React Native.

---

## 10. UI implementation notes (Android)

- Prefer flat `Screen → Sections → Content`; soft cards only when they aid interaction (task cards, note rows).
- No nested card stacks; no colorful decorative cards.
- Outline icons (Lucide / Phosphor / Fluent / Heroicons-style).
- Motion: fade / slide / soft spring for sheets, column swipe, preview toggle — never gamified completion spectacle.
- Touch targets comfortable; preserve whitespace (do not densify into generic Material lists).
- Typography carries hierarchy (hero time, calendar date, titles).

---

## 11. Testing strategy

| Layer | Focus |
|-------|-------|
| Rust unit/integration | Column moves, session lifecycle, import transactions, migrations |
| FFI smoke | Kotlin ↔ Rust commands; error code mapping |
| RN critical flows | Nav, Kanban swipe/move, note autosave, planner sheet/panel |
| Manual device | Offline, background Pomodoro, SAF backup/import, phone + tablet layouts |

Business correctness is proven in Rust first.

---

## 12. Success metrics (from `APP.md`)

Track against existing product outcomes:

- Time-to-start Pomodoro from cold open
- Tasks moved To Do → Working → Finished per active day
- Notes created and reopened within 7 days
- Backup / export success rate
- Crash-free sessions / failed autosave rate
- Qualitative cross-platform recognition vs Windows

---

## 13. Open implementation choices (within locked architecture)

Resolve during R0/R2 without changing the stack:

1. **FFI mechanism** — UniFFI vs hand-written JNI; pick one and keep DTOs stable.
2. **Async runtime on mobile** — align `adhder-db` threading with Android workers to avoid ANRs.
3. **Rich-text document schema** — versioned JSON (or equivalent) stored by `adhder-notes` with `format = rich_text`.
4. **Settings nav placement** — primary sixth destination vs overflow/profile entry; module remains first-class either way.
5. **Relationship to Desktop rebuild** — share crates from day one; avoid Android-only forks of use cases.

---

## 14. Deliverables checklist

- [ ] Cargo workspace + migrations + feature crates with tests
- [ ] `adhder-android` FFI + Kotlin bridge
- [ ] RN app: phone bottom nav + tablet rail
- [ ] Modules: Dashboard, Pomodoro, Tasks, Planner, Notes, Settings
- [ ] Android rich-text Notes (no Markdown)
- [ ] Local notifications for Pomodoro completion
- [ ] Backup / Import / Export via SAF + Rust apply
- [ ] Design tokens matching `DESIGN_SYSTEM.md` + app icon
- [ ] Update `APP.md` / architecture docs only if behavior meaningfully changes

---

## 15. Conflict resolution reminder

| Concern | Winner |
|---------|--------|
| Stack / crate shape | `AGENTS.md` + `RUST_ARCHITECTURE.md` |
| Product behavior / IA | Windows behavior, then `APP.md` |
| Visual detail | `DESIGN_SYSTEM.md` |
| Figma board | Inspiration only; cannot override the above |

When uncertain: keep offline-first Rust + SQLite intact, preserve Kanban and Notes editor split, and keep Windows visual identity recognizable on Android.
