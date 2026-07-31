# ADHDer — Product Requirements Document

**Status:** Canonical product documentation  
**Source of truth:** Windows Desktop application  
**Audience:** Product, design, engineering, and AI coding agents

This document describes the existing ADHDer product. It does not introduce new features or redesign the application. Android is a mobile adaptation of the same product identity.

---

## 1. Product overview

ADHDer is an offline-first productivity application for people who need calm structure: focus sessions, tasks, planning, and lightweight note capture.

### Platforms

| Platform | Status | Role |
|----------|--------|------|
| Windows Desktop | Shipped (canonical) | Source of truth for product, UX, and visual identity |
| Android Phone | Mobile adaptation | Same product, touch-first layout |
| Android Tablet / Samsung Tablet | Mobile adaptation | Near-desktop organization with tablet patterns |
| iPad | Future | Same identity, platform-native shell |
| macOS | Future | Same identity, desktop patterns |

### Product pillars

- **Offline first** — Full core functionality without network
- **Minimal** — Few elements, generous space, no chrome noise
- **Fast** — Instant open, instant save, low friction
- **Focus-first** — One primary action per screen when possible
- **Cross-device consistency** — Recognizably the same product on every form factor

### Modules

1. Dashboard  
2. Pomodoro  
3. Tasks  
4. Planner  
5. Notes  
6. Settings  

---

## 2. Personas and jobs-to-be-done

Derived from existing modules only.

### Primary jobs

| Job | Module(s) |
|-----|-----------|
| See what matters right now | Dashboard |
| Enter a timed focus session | Pomodoro |
| Move work from backlog to done | Tasks |
| Plan the day / week on a calendar | Planner |
| Capture thoughts quickly | Notes |
| Configure the app and manage data | Settings |

### User expectations

- Open the app and immediately orient (time, date, current focus).
- Start focus without navigating through clutter.
- Drag or swipe tasks through a clear three-stage workflow.
- Plan without decorative calendar chrome.
- Capture a note in seconds; edit without heavy tooling.
- Work fully offline; never lose work to a failed sync.

---

## 3. Information architecture

```
ADHDer
├── Dashboard
├── Pomodoro
├── Tasks
│   ├── To Do
│   ├── Working
│   └── Finished
├── Planner
│   ├── Calendar
│   └── Agenda
├── Notes
│   ├── Folders / list
│   └── Editor (± preview on Desktop / Tablet)
└── Settings
    ├── Preferences
    ├── Backup
    ├── Import
    ├── Export
    └── Notifications
```

All modules share one local SQLite database as the single source of truth. Business rules live in the shared Rust core; clients render state and send commands.

---

## 4. Navigation

Navigation preserves product identity while matching each form factor.

| Form factor | Pattern | Behavior |
|-------------|---------|----------|
| Desktop (Windows) | Sidebar | Persistent primary destinations; rounded active selection |
| Tablet | Navigation rail | Compact vertical destinations; multi-pane content |
| Phone | Bottom navigation | Thumb-reachable primary destinations |

### Destinations

Dashboard · Pomodoro · Tasks · Planner · Notes · Settings

Settings may sit in the same primary nav or as a secondary entry depending on platform chrome density, but it remains a first-class module.

### Active state

The active destination uses the desktop-style **rounded selection** treatment on all platforms. Color accent is reserved for selection and progress — not decorative fills.

---

## 5. Screen specifications

### 5.1 Dashboard

**Purpose:** Orient the user. Show time, date, and current focus with almost nothing else.

**Layout (all platforms, content-centered):**

- Small analog clock (above)
- Large digital clock (primary)
- Day and date beneath
- Current focus task
- Minimal statistics (secondary, sparse)

**Interactions:**

- Tap / click current focus task → open that task or Tasks module context
- Statistics are glanceable only; not a dashboard of widgets

**Empty states:**

- No current focus → calm prompt to choose a task or start Pomodoro
- No stats yet → omit or show zero-state quietly

**Edge cases:**

- Do not add weather, feeds, or promotional widgets
- Preserve large whitespace; avoid packing secondary cards

---

### 5.2 Pomodoro

**Purpose:** Run a focus session with a calm, large timer.

**Layout:**

- Large circular timer
- Very thin progress ring
- Large timer typography
- Minimal controls
- Large Start (primary) control
- Statistics underneath

**Interactions:**

- Start / Pause / Reset (minimal control set)
- Session completion updates statistics and may notify (see Notifications)
- Optional link to current focus task when one is set

**Empty / idle:**

- Timer at configured session length, ready to start

**Edge cases:**

- Backgrounding on mobile continues session semantics via system-appropriate timers/notifications
- Do not add gamified animations or loud completion effects

---

### 5.3 Tasks

**Purpose:** Kanban workflow for work in three stages.

**Columns (fixed):**

1. **To Do**  
2. **Working**  
3. **Finished**

**Card content:**

- Clean title
- Minimal metadata
- Priority as a **small colored indicator** (not large badges)

**Phone:**

- Horizontally swipeable Kanban columns (one column primary at a time; swipe between To Do, Working, Finished)
- Touch-first drag or move actions to change column

**Tablet:**

- Three columns visible simultaneously
- Desktop-like organization with touch targets

**Desktop:**

- Three-column Kanban as in the Windows application

**Empty states:**

- Per-column empty copy; never fill with placeholder cards

**Edge cases:**

- Moving to Finished is explicit and reversible within the Kanban model
- Priority color is semantic, not decorative rainbow theming

---

### 5.4 Planner

**Purpose:** Calendar-first planning with an agenda for the selected day.

**Layout:**

- Large calendar (primary)
- Minimal decorations
- Agenda for selected date

**Phone:**

- Calendar as main surface
- Agenda as **bottom sheet**

**Tablet:**

- Calendar + **side panel** agenda

**Desktop:**

- Calendar + right-side agenda (Windows layout)

**Interactions:**

- Select date → agenda updates
- Create / open planned items from agenda
- Navigate months with minimal chrome

**Empty states:**

- Selected day with no items → quiet empty agenda

---

### 5.5 Notes

**Purpose:** Fast capture and lightweight editing. Android experience is Keep-inspired; Desktop authoring is Markdown (Notion-like).

#### Platform editor split (locked)

| Platform | Editor | Formats |
|----------|--------|---------|
| **Desktop (Windows)** | Markdown | Notion-like Markdown authoring and rendering |
| **Android (Phone & Tablet)** | Lightweight rich text | **No Markdown.** Bold, Italic, Underline, Bullets, Numbered lists, Checklist, Tables |

Rich-text toolbar on Android stays subtle and minimal. Desktop Markdown tooling stays unobtrusive (no heavy IDE-style chrome).

#### Layout

**Phone:**

- Single editor surface
- Preview toggled with animation when applicable to the platform editor model
- List / folders → editor (stack navigation)

**Tablet:**

- Split where space allows: Folders | Editor | Preview (as platform supports)
- Multi-pane organization inspired by desktop

**Desktop:**

- Folders / list + Markdown editor + preview as in the Windows application

**Interactions:**

- Create note, edit title/body, organize into folders
- Autosave on change (see Autosave)
- Checklist and table editing on Android via rich-text controls; on Desktop via Markdown constructs

**Empty states:**

- No notes → single calm create action
- Empty note → focus in editor immediately

**Edge cases:**

- Do not force Markdown onto Android
- Do not strip Desktop Markdown down to rich-text-only
- Avoid heavy toolbars; icons remain outline and quiet

---

### 5.6 Settings

**Purpose:** Preferences, data management, and notification controls.

**Areas:**

- Application preferences (focus durations, defaults, display behaviors as implemented)
- **Backup**
- **Import**
- **Export**
- **Notifications**

**Interactions:**

- Change preference → persist locally via Rust core
- Backup / Export produce portable data the user controls
- Import restores or merges per existing import rules
- Notification toggles respect OS permission gates

**Edge cases:**

- Failed import surfaces a clear error; does not corrupt existing data
- Backup/export work offline

---

## 6. Workflows

### 6.1 Task flow

1. Create task in **To Do** (or capture into To Do from related entry points).  
2. Move to **Working** when active.  
3. Optionally set as Dashboard current focus / use with Pomodoro.  
4. Move to **Finished** when done.  
5. Review Finished; archive or leave as historical list per existing behavior.

Phone: swipe columns horizontally; move cards with touch gestures.  
Tablet / Desktop: multi-column drag or explicit move.

### 6.2 Planner flow

1. Open Planner → land on calendar.  
2. Select a date.  
3. Review agenda (sheet on phone, side panel on tablet, right panel on desktop).  
4. Add or open planned items.  
5. Return to calendar for another day.

### 6.3 Pomodoro flow

1. Optionally set current focus task.  
2. Open Pomodoro → confirm duration.  
3. Start → thin ring progresses; large time remains readable.  
4. Pause / resume as needed.  
5. Complete → stats update; notification if enabled.  
6. Start next session or return to Dashboard / Tasks.

### 6.4 Notes flow

1. Open Notes → browse folders / list.  
2. Create or open a note.  
3. **Desktop:** write Markdown; preview as needed.  
4. **Android:** edit with rich-text controls (no Markdown).  
5. Autosave continuously.  
6. Organize / leave; content remains local.

### 6.5 Settings, backup, import, export

1. Open Settings.  
2. Adjust preferences (immediate local persistence).  
3. **Backup** — create a backup artifact locally.  
4. **Export** — export user data in the supported format(s).  
5. **Import** — choose file; validate; apply without destroying unrecoverable state on failure.  
6. Confirm success or error with calm, clear messaging.

### 6.6 Notifications flow

1. User enables notifications in Settings (and OS prompt if required).  
2. Pomodoro completion and other existing notification events fire only when enabled.  
3. Tapping a notification deep-links to the relevant module when possible.  
4. Disabled notifications never block core offline use.

---

## 7. System behaviors

### 7.1 Offline behavior

- All core modules work without network.
- SQLite is the system of record.
- No feature may require cloud availability for basic create/read/update/delete.
- Future sync (roadmap) must remain additive, not a dependency for local use.

### 7.2 Autosave

- Notes and other editable entities autosave on change.
- No explicit “Save” requirement for routine editing.
- Failures surface quietly but clearly; retry without data loss when possible.

### 7.3 Notifications

- Opt-in and OS-permission aware.
- Used for focus/session completion and other existing alerts — not marketing.
- Must remain calm and actionable.

### 7.4 Backup / Import / Export

- User-controlled data portability.
- Operates offline.
- Import is safe: validate first; never silently wipe on partial failure.

---

## 8. UX principles

Aligned with the design system; summarized for product decisions:

1. **Content dominates** — UI chrome disappears.  
2. **Whitespace is structure** — Prefer fewer elements with room to breathe.  
3. **Typography over color** — Hierarchy via size and weight; monochrome palette; single blue accent.  
4. **One job per screen** — Especially Dashboard and Pomodoro.  
5. **Touch and pointer both first-class** — Adapt layout, not identity.  
6. **Calm motion** — State change only; never spectacle.  
7. **Same product everywhere** — A user should recognize ADHDer instantly across Windows and Android.

---

## 9. Platform adaptations

### Desktop (Windows)

- Sidebar navigation  
- Multi-column layouts (Tasks, Notes, Planner agenda)  
- Pointer density with generous whitespace  
- Markdown Notes with preview  

### Tablet

- Navigation rail  
- Multi-pane layouts and split views  
- Three Kanban columns visible  
- Planner agenda as side panel  
- Notes split: folders / editor / preview where space allows  
- Landscape behaves like a lightweight desktop app  

### Phone

- Bottom navigation  
- Floating action button where the Windows patterns map to a primary create action  
- Vertical scrolling; one-handed reach  
- Horizontally swipeable Kanban columns  
- Planner agenda as bottom sheet  
- Notes: single editor; preview toggle with animation  
- Rich-text Notes only (no Markdown)  

---

## 10. Success metrics

Metrics describe outcomes for the existing product — not new feature ideas.

| Metric | Intent |
|--------|--------|
| Time-to-start Pomodoro from cold open | Focus friction |
| Tasks moved To Do → Working → Finished per active day | Workflow completion |
| Notes created and reopened within 7 days | Capture usefulness |
| Backup / export success rate | Data trust |
| Crash-free sessions / failed autosave rate | Reliability |
| Cross-platform recognition (qualitative) | Same product identity |

---

## 11. Future roadmap

Explicitly **out of current product scope**. Documented for planning only; do not treat as shipped.

| Item | Intent |
|------|--------|
| AI | Assistive features on top of local data |
| Sync | Optional multi-device sync; offline remains default |
| OCR | Capture text from images into Notes/Tasks flows |
| Voice | Voice input / commands as an additive channel |
| iPad | Same product identity on iPadOS |
| macOS | Same product identity on macOS |

Roadmap items must not break offline-first guarantees or move business logic out of Rust.

---

## 12. Document ownership

| Topic | Document |
|-------|----------|
| Product / UX requirements | `APP.md` (this file) |
| Visual language & components | `DESIGN_SYSTEM.md` |
| Engineering rules for agents | `AGENTS.md` |
| Rust core architecture | `RUST_ARCHITECTURE.md` |

When product behavior and visual rules disagree in interpretation, **Windows Desktop behavior wins**, then this PRD, then the design system for presentation detail.
