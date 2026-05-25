# DESIGN-SYSTEM.md — Dot Visual Specification

## Philosophy

Sober brutalism. Not vibe-coded. Not startup-polished. Not glassmorphism-as-decoration.

The UI communicates hierarchy through typography weight and spacing, not through
color saturation or gradient layers. Glass effects serve a structural purpose —
they separate content planes — not an aesthetic one. The accent color is rationed:
it marks exactly two things — the active agent indicator and the primary action button.
Everything else is beige or black.

---

## Palette

Three colors. The accent is **earned**, not sprayed.

### Light Mode (`:root`, `[data-theme="light"]`)

```css
--bg:         #EBEBEB;                    /* ground */
--bg-surface: #E2E2E0;                    /* raised surface, cards */
--text:       #1A1A1A;                    /* primary text */
--text-muted: #8A8A88;                    /* secondary, labels, timestamps */
--line:       rgba(0, 0, 0, 0.09);        /* borders, dividers, separators */
--accent:     #C45A2D;                    /* burnt amber — active agent, send btn ONLY */
--accent-muted: rgba(196, 90, 45, 0.10);  /* accent bg fills — pills, badges */
--glass:      rgba(255, 255, 255, 0.45);  /* card/bubble background */
--glass-border: rgba(255, 255, 255, 0.65);/* card border */
--input-bg:   rgba(255, 255, 255, 0.50);  /* input field fill */
```

### Dark Mode (`[data-theme="dark"]`)

```css
--bg:         #0C0C0C;
--bg-surface: #161616;
--text:       #E8E6E1;
--text-muted: #6B6B68;
--line:       rgba(255, 255, 255, 0.07);
--accent:     #D4714A;
--accent-muted: rgba(212, 113, 74, 0.12);
--glass:      rgba(24, 24, 22, 0.55);
--glass-border: rgba(255, 255, 255, 0.05);
--input-bg:   rgba(255, 255, 255, 0.04);
```

### Accent Usage Rules

The accent color appears in exactly these places:

| Element | How |
|---------|-----|
| Active agent avatar border | `border-color: var(--accent)` |
| Active agent label text | `color: var(--accent)` |
| Send button | `background: var(--accent)` (solid) |
| Status row left edge | `border-left: 2px solid var(--accent)` |
| Result count badge | `background: var(--accent); color: var(--bg)` |
| Workflow pill on hover | `border-color: var(--accent)` |
| Boot screen tag pill | `background: var(--accent-muted); color: var(--accent)` |

**Nowhere else.** No amber backgrounds. No amber headings.
No amber links. No amber borders on cards.

---

## Typography

| Role | Font | Weight | Size | Tracking | Transform |
|------|------|--------|------|----------|-----------|
| Boot heading | Cormorant Garamond | 300 (light) | 32px | -0.01em | none |
| Boot heading italic | Cormorant Garamond | 300 italic | 32px | -0.01em | italic |
| Body | Manrope | 400 | 13px | normal | none |
| Body emphasis | Manrope | 500 | 13px | normal | none |
| Label / status | System monospace | 700 | 8–9px | 0.12em | uppercase |
| Code inline | System monospace | 400 | 11px | normal | none |
| Tag pill | System monospace | 400 | 8px | 0.25em | uppercase |
| Brand mark | System monospace | 700 | 10px | 0.18em | uppercase |

Font loading in `pages/side-panel/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet">
```

Cormorant Garamond is used **only** on the boot screen heading.
Everywhere else is Manrope or system monospace.

---

## Glass Treatment

Glass is structural, not decorative. It separates content planes.

```css
.glass {
  background: var(--glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
}
```

No `saturate()`. No `box-shadow` on glass cards. No glow effects.
The blur is 16px (not 20px) — enough to read depth, not enough to feel frosted.

Cards get no `border-radius` greater than `4px`. This is brutalist.

---

## Component Specifications

### TopBar
- Height: 48px
- Left: brand mark (8×8px amber square + "DOT / v0.1" in monospace)
- Right: live dot (6px, `var(--accent)`, pulsing only when agent is active) + dark mode toggle
- Bottom border: `1px solid var(--line)`
- No background blur. Flat `var(--bg)`.

### Boot Screen
- Centered vertically and horizontally
- Stack (top to bottom): tag pill → heading → subtitle → power button → "Initialize" label
- Tag pill: `var(--accent-muted)` bg, `var(--accent)` text, monospace 8px, rounded 20px
- Heading: Cormorant Garamond 300, 32px, `var(--text)`. One word in italic: "you *are*."
- Subtitle: monospace 9px, `var(--text-muted)`, uppercase, 0.15em tracking
- Power button: 48×48px, `border-radius: 50%`, `1px solid var(--line)`, glass bg
- Power hover: `border-color: var(--accent)`, `color: var(--accent)` — no glow, no shadow, no scale

### Agent Message
- Layout: avatar (left) + bubble (right)
- Avatar: 28×28px, `border-radius: 4px`, glass bg, `1px solid var(--line)`
  - Text: monospace 9px bold, `var(--text-muted)`
  - Active: `border-color: var(--accent)`, `color: var(--accent)`
- Bubble: glass bg, `border-radius: 2px 4px 4px 4px` (hard top-left corner)
  - Label: monospace 8px bold, `var(--accent)`, uppercase, 0.12em tracking
  - Body: Manrope 13px, `var(--text)`, line-height 1.65
  - No box-shadow.

### User Message
- Right-aligned
- Background: `var(--text)` (solid — no glass)
- Color: `var(--bg)`
- Border-radius: `4px 4px 2px 4px` (hard bottom-right)
- Max-width: 75%

### Status Row
- `border-left: 2px solid var(--accent)`
- Background: transparent (NOT glass, NOT accent-tinted)
- Padding: 10px 16px
- Pulsing dot: 6px `var(--accent)`, animation only when active
- Text: monospace 10px, `var(--text-muted)`, uppercase

### Workflow Pill
- Border: `1px solid var(--line)`
- Background: transparent
- Border-radius: 4px
- Text: monospace 9px, `var(--text-muted)`
- Hover: `border-color: var(--accent)`, `color: var(--accent)` — nothing else changes
- No background fill on hover.

### Chat Input
- Glass input field, `border-radius: 4px`
- Placeholder: monospace 9px, `var(--text-muted)`, uppercase
- Focus: `border-color: var(--accent)` — no glow, no shadow
- Attach button (📎): 32×32px, `border-radius: 4px`, transparent bg, `1px solid var(--line)`, `var(--text-muted)`
  - Hover: `border-color: var(--accent)`, `color: var(--accent)`
  - Position: left of input field (before text input, after attach button, then send)
  - Layout order: `[📎] [input field] [→]`
- Send button: 32×32px, `border-radius: 4px`, `background: var(--accent)`, `color: #fff`
- Send hover: `opacity: 0.85` — no scale, no shadow
- Drag-drop zone: entire input wrapper. On dragover: `border-color: var(--accent)` on input wrapper. No overlay, no shading.

### File Chip
- Renders in a row above the input bar when files are attached
- Container: `display: flex; gap: 6px; flex-wrap: wrap; padding: 0 20px 4px`
- Chip: `1px solid var(--line)`, `background: var(--glass)`, `border-radius: 4px`, `padding: 4px 10px`
- Text: monospace 9px, `var(--text-muted)`, format: `filename.ext · 142KB`
- Remove ×: monospace 9px, `var(--text-muted)`, `margin-left: 6px`, `cursor: pointer`
- Remove hover: `color: var(--accent)`
- No icons. No file type indicators. Just text.

### Results Card
- Glass card, `border-radius: 4px`
- Header: monospace label + count badge (amber bg, `var(--bg)` text, `border-radius: 4px`)
- Rows: `border-bottom: 1px solid var(--line)`, padding 10px 0
- Row hover: `background: rgba(0,0,0,0.02)` (light) / `rgba(255,255,255,0.02)` (dark)
- No warm tint. No amber on rows.
- Job title: Manrope 12.5px 500, `var(--text)`
- Company: monospace 10px, `var(--text-muted)`
- Tag: monospace 8px, `var(--accent)`, `background: var(--accent-muted)`, `border-radius: 4px`

---

## What This Design Is Not

- **Not rounded.** Max border-radius is 4px on cards. Only the power button and tag pills are round.
- **Not glowing.** No box-shadows on interactive elements. No ambient radial gradients.
- **Not warm.** The accent is warm; the system is cold. The warmth is a controlled punctuation.
- **Not animated.** Transitions are 0.2s linear on border/color only. No cubic-bezier easing. No scale transforms. No fade-ins longer than 0.3s.
- **Not decorative.** No background patterns. No grain textures. No noise overlays. The background is a flat color.

---

## Transitions

```css
/* Standard: borders and colors only */
transition: border-color 0.2s, color 0.2s;

/* Boot → chat transition (the ONE exception) */
transition: opacity 0.3s;
```

No `transform` transitions. No `box-shadow` transitions. No `background` transitions.

---

## Scrollbar

```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
```

---

## Tailwind Config Extension

In `packages/tailwind-config/`, add:

```js
colors: {
  ground: 'var(--bg)',
  surface: 'var(--bg-surface)',
  ink: 'var(--text)',
  muted: 'var(--text-muted)',
  amber: 'var(--accent)',
  'amber-muted': 'var(--accent-muted)',
  line: 'var(--line)',
  glass: 'var(--glass)',
  'glass-border': 'var(--glass-border)',
}
```
