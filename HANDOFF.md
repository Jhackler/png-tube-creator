# Fork notes — png-tube-creator

This file used to be the **upstream design dump** (Windows `H:\Git\devtools\…` paths, port 3000, OpenAI-only). That document is stale. Trust `README.md` and the code.

## This repo

Hard fork of Angel's Sword Studios' AS Adventurer Creator.

- GitHub: [Jhackler/png-tube-creator](https://github.com/Jhackler/png-tube-creator)
- Product: 4-tab vanilla SPA that makes PNGtuber assets
- **Port: 3001** (`PORT` env override)
- **Linux is the target.** `launch.sh` is the TUI installer/runner. Windows `.bat` / exe packaging is leftover; do not spend effort on it.

Companion: [Jhackler/Ai-png-tuber-overlay](https://github.com/Jhackler/Ai-png-tuber-overlay) on **3000**.

## Fork deltas (vs upstream)

1. **`launch.sh`** — distro-agnostic Linux TUI (`setup` / `update` / `start`). Portable Node 20.x into `./runtime/` if system Node < 18. Opens a terminal when double-clicked.
2. **OpenRouter image gen** — Settings radios OpenAI vs OpenRouter. Catalog is filtered to models that generate images **and** accept reference images (`lib/image-provider/`, `public/image-settings.js`). Keys stay in `localStorage`.
3. Personal Linux-first prefs. Do not break Windows on purpose; do not maintain it.
4. **Projects column** — pick an absolute folder, create or select a character, save pipeline files there. Overlay clips use selector names (`neutral_idle.webm`) inside the character folder. Brave has no folder picker; the path field is the control. Server routes: `/api/project/open`, `/list`, `/prepare`, `/save`. Bound to `127.0.0.1`.
5. **Image model on Sprite Prep** — same OpenRouter list as Settings. Provider still switches only in Settings.

## Architecture (still true)

- No framework. `server.js` serves `public/` and proxies APIs.
- Image: `createProvider('openai'|'openrouter')` in `lib/image-provider/`.
- Video: Gemini `v1beta/interactions` via `/api/video/generate` + `/api/video/poll`.
- Tab handoff: `window.ASAdventurer.handoff` (sprite, video, `keyColor`).
- Projects: `public/lib/project-store.js` plus `lib/project-write.js`. Path rules in `public/lib/project-layout.js` (tested via `lib/project-paths.js`).
- Biggest file: `public/model-exporter.js` (chroma key + GIF/WebM). Chroma/GIF helpers live in `public/lib/`.
- Default canvas 1280×720, sprite bottom-anchored. Preferred key: magenta `#FF00FF`.

## UI docs

- Layout / UX (tabs, tooltips, handoff): [`docs/layout.md`](docs/layout.md)
- Colors / type / radii (retheme here): [`docs/theme.md`](docs/theme.md)

Live tokens: `public/style.css` `:root`. Do not copy palettes into this file.

## Overlay filename contract

Expression states the overlay actually loads: `neutral_idle` (required), `{happy,sad,surprised}_{idle,speaking}`, `typing`, `eyes_closed`. With a project open, exporter presets are those names and save as `Character/neutral_idle.webm`. Intro, outro, and animation go in `extras/`. Emotes in the overlay still live under `emotes/<name>/`. Copy the character folder into `public/assets/`; `sprite/`, `video/`, `ready.txt`, and `extras/` are ignored.

## Do not use from the old dump

- Port 3000 for this app
- “OpenAI only”
- Filename presets `{name}_Neutral_Idle` as the overlay contract. With a project open, the file is `neutral_idle.webm` inside the character folder.
- `.bat` as the primary launcher
- `H:\Git\devtools\…` workspace paths
- External `editor.css` / ASArtTool / Fugi Maker file:// links
