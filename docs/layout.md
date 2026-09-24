# Layout & UX

How the creator UI is put together. Hex colors live in `docs/theme.md` and `:root` — do not put palettes here.

Goal: a beginner can go sprite → video → loop → export without reading a manual. Simplicity over Live2D. Vanilla HTML/CSS/JS; no new framework.

## Chrome

1. **Projects column** — left, about 260px, `--bg-panel`. One gold **Projects** heading. Path field, Use path, New character, then the folder list. This is the only sidebar. Do not add a second nav.
2. **Header** — 64px (`--header-h`). Logo + wordmark left, pipeline steps right. No project controls here.
3. **Tab bar** — one row under the header. Inactive muted; active uses heading font + **3px gold underline** (not a filled pill).
4. **Tab body** — one visible panel at a time. Cards, not a dashboard soup.
5. **Pipeline order** — ① Sprite Prep → ② Generate Video → ③ Video Prep → ④ Model Exporter → ⚙️ Settings.

Settings is a tab, not a modal.

## Pipeline UX

- Numbered badges ①②③④ on the tabs.
- Every control that isn’t obvious gets a **hover tooltip** in plain language.
- Between tabs: **Send to next step →** handoff (sprite canvas/blob, video, `keyColor` via `window.ASAdventurer.handoff`). Sending a generated sprite on creates the character folder if the projects path is open and the name is new. It does not write a sprite file unless the user saves.
- Sprite handoff asks before writing `sprite/sent_YYYYMMDD_HHMMSS.png`. Skipping the file still creates the folder.
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
- Don’t invent another nav region. The projects column is the sidebar. Tabs stay the pipeline.
- Don’t skip tooltips on new sliders.

## Overlay filename layout (product, not CSS)

Exporter presets, with a project open, are the overlay keys: `neutral_idle`, `{happy,sad,surprised}_{idle,speaking}`, `typing`, `eyes_closed`. They save as `Character/<slot>.webm`. Intro, outro, and animation save under `extras/`. See `README.md` Projects and `HANDOFF.md`.
