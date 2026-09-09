# Theme (colors, type, chrome)

Swap this file + the `:root` block in `public/style.css` to recolor. Do **not** change `docs/layout.md` for a palette swap.

Source of truth for values: `public/style.css` `:root`. This page names them.

Dark mode always. Brand mark: ⚔️. Gold is the accent, not a light theme.

## Tokens

Copy these names. Hex is the current fork default.

| Token | Current | Role |
|-------|---------|------|
| `--bg-deep` | `#1a1a2e` | Page background |
| `--bg-panel` | `#16213e` | Solid panel |
| `--bg-panel-alt` | `#1b2a4a` | Alternate / hover step |
| `--bg-input` | `#0f1a30` | Inputs, wells |
| `--bg-card` | `rgba(22, 33, 62, 0.75)` | Glass cards |
| `--accent-gold` | `#dbb858` | Brand, active, primary buttons |
| `--accent-gold-soft` | `#c4a04e` | Darker gold |
| `--accent-gold-glow` | `rgba(219, 184, 88, 0.3)` | Glow / focus ring |
| `--accent-gold-dim` | `rgba(219, 184, 88, 0.15)` | Quiet gold fill |
| `--accent-red` | `#e94560` | Danger (legacy name; errors use `--clr-error`) |
| `--accent-blue` | `#0f3460` | Selected / deep interactive |
| `--accent-teal` | `#5bb5a6` | Info / secondary accent |
| `--clr-success` | `#7b9f6e` | Success |
| `--clr-error` | `#c75050` | Error |
| `--clr-info` | `#5bb5a6` | Info |
| `--clr-warning` | `#dbb858` | Warning (= gold) |
| `--text` | `#e0e0e0` | Body |
| `--text-bright` | `#fff8ee` | Headings on cards |
| `--text-muted` | `#8899aa` | Labels |
| `--text-dim` | `#556677` | Tagline / quiet |
| `--border` | `rgba(255,255,255,0.08)` | Default edge |
| `--border-light` | `rgba(255,255,255,0.12)` | Stronger edge |
| `--border-gold` | `rgba(219, 184, 88, 0.15)` | Card edge |
| `--border-gold-med` | `rgba(219, 184, 88, 0.25)` | Card hover |

## Type

Loaded via `<link>` in `index.html` (not `@import` in CSS).

| Token | Stack | Use |
|-------|--------|-----|
| `--font-display` | Cinzel Decorative, Georgia | Wordmark |
| `--font-heading` | Cinzel, Georgia | Tabs, card titles |
| `--font-body` | Outfit, Segoe UI | UI copy |
| `--font-mono` | Share Tech Mono | Version, codes |

Wordmark: gold gradient `135deg` gold → `#f0d878`, `background-clip: text`.

Weights: labels 500, titles 600, display 700.

## Chrome (theme-adjacent)

Keep radii/shadows on the theme side so a “sharper” skin can change them without touching layout rules.

| Token | Current |
|-------|---------|
| `--radius-sm` / `--radius` / `--radius-lg` / `--radius-xl` | 4 / 8 / 12 / 16 px |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.4)` |
| `--shadow` | `0 4px 20px rgba(0,0,0,0.3)` |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.6)` |
| `--shadow-glow` | gold glow |
| `--ease` | `0.2s ease` |
| `--spring` | `0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--header-h` | `64px` |

## Overlay sibling

The overlay control panel uses the **same hexes** but shorter names (`--accent`, `--bg-primary`, `--text-primary`). If you retheme both apps, change both `:root` blocks. See `Ai-png-tuber-overlay/docs/theme.md`.
