# ADHDer — Design System

**Status:** Canonical visual documentation  
**Source of truth:** Windows Desktop application UI  
**Audience:** Design, engineering, and AI coding agents

This document records the existing ADHDer design language. It does not redesign the UI, invent a new visual identity, or convert the product to Material Design / Material You.

Android must preserve the same design language and visual identity, adapted thoughtfully for touch — not rebuilt as a generic Android showcase.

---

## 1. Source of truth

| Rule | Detail |
|------|--------|
| Canonical UI | Windows Desktop application |
| Android role | Same product identity; touch-adapted layouts |
| Future iOS / macOS | Same visual identity; platform shells only |
| Forbidden | Material You theming, rainbow cards, unrelated redesigns |

A user must instantly recognize Windows and Android builds as the same product.

### Product feel

Calm · Minimal · Spacious · Focus-oriented · Premium · Modern · Productivity-first

---

## 2. Core principles

### 2.1 Large amounts of whitespace

Every screen should breathe. Never overcrowd. Prefer fewer elements with generous spacing over dense layouts.

### 2.2 Large typography

Important information uses large type. Hierarchy comes from typography first, color second.

Examples: Dashboard clock, Pomodoro timer, calendar date, note titles, section headings.

### 2.3 Minimal color palette

The UI is almost monochrome.

| Role | Values |
|------|--------|
| Surfaces | White, soft neutral grays |
| Text / icons | Black and neutral grays |
| Accent | **Single blue** |

Use color only for:

- Active navigation
- Progress
- Selected states
- High-priority indicators
- Success / error states
- Soft surfaces (subtle gray fills)

No colorful cards. No rainbow UI.

### 2.4 Cards: soft, not loud

When cards are used:

- Large corner radius
- Soft shadows
- Very subtle elevation
- No harsh borders
- No skeuomorphic effects

### 2.5 Thin icons

Clean outline icons only by default.

Allowed families (outline): Lucide, Phosphor, Fluent, Heroicons.

Avoid filled icons as the default system.

### 2.6 Minimal chrome

Hide unnecessary UI. Content dominates. The application itself should visually disappear.

### 2.7 Flat layouts

Avoid nested cards.

Prefer:

```
Screen → Sections → Content
```

Not:

```
Card → Card → Card → Card
```

### 2.8 Motion

Subtle only. Communicate state changes. Never distract.

Allowed: fade, scale, slide, soft spring.

---

## 3. Foundations

### 3.1 Color

**Neutrals**

- Background: white / near-white
- Soft surface: light gray
- Border (if unavoidable): very light gray, prefer shadow/spacing instead
- Primary text: near-black
- Secondary text: medium gray
- Disabled: light gray

**Accent**

- Single blue for primary actions, active nav, progress emphasis

**Semantic**

- Success, error, and priority indicators — restrained, never decorative rainbow sets
- Priority on task cards: small colored indicator only

### 3.2 Typography

| Role | Character |
|------|-----------|
| Hero time (Dashboard clock, Pomodoro) | Very large, calm, highly legible |
| Calendar date | Large |
| Note titles / section headings | Large, clear hierarchy |
| Body | Comfortable reading size |
| Meta / captions | Smaller, secondary gray |

Typography carries hierarchy. Do not compensate for weak type with color blocks.

### 3.3 Spacing

- Prefer generous padding and section gaps
- Phone: keep one-handed comfort; do not collapse to dense Material lists
- Desktop / tablet: preserve the Windows sense of air

### 3.4 Radius and elevation

| Element | Treatment |
|---------|-----------|
| Cards | Large radius, soft shadow, subtle elevation |
| Buttons / inputs | Rounded |
| Dialogs | Rounded, spacious |
| Nav selection | Rounded selection (desktop identity) |

Avoid harsh 1px cages and heavy multi-layer shadows.

### 3.5 Iconography

- Outline, thin stroke
- Consistent size within a toolbar or nav set
- Accent color only when selected / active

---

## 4. Components

Every component inherits the same design language.

### 4.1 Buttons

- Rounded
- Minimal
- Primary: solid blue, no gradients
- Secondary: quiet neutral / text / outline as needed
- Large Start on Pomodoro remains visually dominant

### 4.2 Inputs

- Rounded
- Soft gray background
- Minimal borders
- Clear focus state without loud glow

### 4.3 Cards

- Large radius
- White surface
- Soft shadow
- Minimal metadata
- No nested card stacks

### 4.4 Dialogs

- Spacious
- Minimal
- Rounded corners
- One primary action; clear dismissal

### 4.5 Lists

- Comfortable spacing
- Large touch targets on phone / tablet
- No dense spreadsheet feel unless content truly requires it

### 4.6 Navigation selection

- Active item uses **rounded selection** matching the desktop application
- Accent blue for active indication
- Inactive items remain quiet gray / outline

### 4.7 Floating Action Button (phone)

- Used on phone where a primary create action maps from desktop patterns
- Single blue accent; minimal; not a cluster of FABs
- Do not invent extra floating chrome on desktop

---

## 5. Module patterns

### 5.1 Dashboard

Preserve the desktop feeling on every platform.

- Large centered digital clock
- Small analog clock above
- Day and date beneath
- Current focus task
- Minimal statistics
- Everything centered with generous whitespace
- No unnecessary widgets

### 5.2 Pomodoro

Exact desktop spirit:

- Large circular timer
- Very thin progress ring
- Large timer typography
- Minimal controls
- Large Start button
- Statistics underneath

### 5.3 Tasks

Preserve Kanban.

| Platform | Layout |
|----------|--------|
| Phone | Horizontally swipeable columns: To Do · Working · Finished |
| Tablet | Three columns simultaneously |
| Desktop | Three columns (Windows layout) |

Cards: clean, rounded, minimal metadata. Priority = small indicator, not large badges.

### 5.4 Planner

- Large calendar, minimal decorations
- Visual hierarchy matches desktop

| Platform | Agenda |
|----------|--------|
| Phone | Bottom sheet |
| Tablet | Side panel |
| Desktop | Right-side agenda |

### 5.5 Notes

Feels like a minimalist writing app. Avoid heavy toolbars. Toolbar icons stay subtle.

| Platform | Structure | Editor |
|----------|-----------|--------|
| Phone | Single editor; preview toggled with animation | Rich text (no Markdown) |
| Tablet | Split: Folders \| Editor \| Preview when space allows | Rich text (no Markdown) |
| Desktop | Folders / list + editor + preview | **Markdown** (Notion-like) |

Android rich-text supports: Bold, Italic, Underline, Bullets, Numbered lists, Checklist, Tables.

---

## 6. Platform layout rules

Do not merely scale desktop layouts down.

### Desktop

- Sidebar
- Large whitespace
- Multi-column layouts

### Phone

- Bottom navigation
- Floating Action Button (primary create where appropriate)
- Vertical scrolling
- Touch-first interactions
- One-handed use

### Tablet

- Navigation rail
- Multi-pane layouts
- Split views
- Desktop-inspired organization
- Landscape ≈ lightweight desktop application

### Navigation mapping

```
Desktop  → Sidebar
Tablet   → Navigation rail
Phone    → Bottom navigation
```

Visual identity (color, type, radius, selection, icon style) remains identical across all three.

---

## 7. Motion language

| Allowed | Use |
|---------|-----|
| Fade | Appear / dismiss, soft content swaps |
| Scale | Subtle emphasis on state change |
| Slide | Sheets, panes, column transitions |
| Soft spring | Natural settle; low exaggeration |

Rules:

- Animations communicate state — never entertain
- No flashy transitions
- Preview toggle on phone Notes uses a calm animated transition
- Kanban column swipes feel physical but restrained

---

## 8. Do / Don’t

### Do

- Follow Windows Desktop as visual source of truth
- Use whitespace and large type for hierarchy
- Keep the palette nearly monochrome + one blue accent
- Use outline icons
- Prefer flat section layouts over nested cards
- Adapt layout patterns per device; keep identity fixed
- Keep Notes editors platform-correct (Desktop Markdown / Android rich text)

### Don’t

- Redesign into Material You or a new brand system
- Add colorful cards, rainbow accents, or decorative badges
- Nest cards inside cards
- Use harsh borders or skeuomorphism
- Default to filled icon sets
- Overcrowd Dashboard with widgets
- Put Markdown editing on Android
- Strip Desktop Notes down to rich-text-only
- Add loud motion or gamified effects

---

## 9. Inspiration anchors

The overall language resembles a combination of:

Windows 11 · TickTick · Microsoft To Do · Notion · Arc Browser · Linear · Obsidian (minimal mode)

These are **reference points only**. They do not override the existing Windows application identity.

---

## 10. Related documents

| Topic | Document |
|-------|----------|
| Product requirements & workflows | `APP.md` |
| Engineering handbook | `AGENTS.md` |
| Rust architecture | `RUST_ARCHITECTURE.md` |

When uncertain, match the Windows UI first, then this design system, then `APP.md` for behavior.
