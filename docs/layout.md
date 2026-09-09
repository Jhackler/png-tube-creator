# Layout & UX

How the creator UI is put together. Hex colors live in `docs/theme.md` and `:root` — do not put palettes here.

Goal: a beginner can go sprite → video → loop → export without reading a manual. Simplicity over Live2D. Vanilla HTML/CSS/JS; no new framework.

## Chrome

1. **Header** — 64px (`--header-h`). Logo + wordmark left, quiet status/actions right.
2. **Tab bar** — one row under the header. Inactive muted; active uses heading font + **3px gold underline** (not a filled pill).
3. **Tab body** — one visible panel at a time. Cards, not a dashboard soup.
4. **Pipeline order** — ① Sprite Prep → ② Generate Video → ③ Video Prep → ④ Model Exporter → ⚙️ Settings.

Settings is a tab, not a modal.

## Pipeline UX

- Numbered badges ①②③④ on the tabs.
- Every control that isn’t obvious gets a **hover tooltip** in plain language.
- Between tabs: **Send to next step →** handoff (sprite canvas/blob, video, `keyColor` via `window.ASAdventurer.handoff`).
- Progress + cancel on AI generate and export.
- Errors tell you the next click (“No API key. Open Settings.”), not a stack trace.
- Keyboard: arrow keys scrub frames; Escape cancels.

## Cards & controls

- Elevation = background steps + gold hairline, not heavy drop shadows.
- Inputs sit on `--bg-input`; labels uppercase, small, muted.
- Primary action = gold fill. Secondary = input well + border.
- Segmented toggles (exporter Adventurer / F. Normal / F. Premium) stay in one row.
- Collapse the working grid around **640px**.

## What not to do

- Don’t add a light theme unless asked.
- Don’t restyle the OBS overlay app from this repo — that’s `Ai-png-tuber-overlay`.
- Don’t invent new layout regions (sidebar nav, top mega-menu). Tabs + cards.
- Don’t skip tooltips on new sliders.

## Overlay filename layout (product, not CSS)

Exporter presets (`{name}_idle`, `_intro`, `_outro`, `_speaking`) are not the overlay expression keys. Overlay wants `neutral_idle`, `{happy,sad,surprised}_{idle,speaking}`, `typing`, `eyes_closed`. See `HANDOFF.md`.
