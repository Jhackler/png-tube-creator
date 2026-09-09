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

## Architecture (still true)

- No framework. `server.js` serves `public/` and proxies APIs.
- Image: `createProvider('openai'|'openrouter')` in `lib/image-provider/`.
- Video: Gemini `v1beta/interactions` via `/api/video/generate` + `/api/video/poll`.
- Tab handoff: `window.ASAdventurer.handoff` (sprite, video, `keyColor`).
- Biggest file: `public/model-exporter.js` (chroma key + GIF/WebM).
- Default canvas 1280×720, sprite bottom-anchored. Preferred key: magenta `#FF00FF`.

## UI docs

- Layout / UX (tabs, tooltips, handoff): [`docs/layout.md`](docs/layout.md)
- Colors / type / radii (retheme here): [`docs/theme.md`](docs/theme.md)

Live tokens: `public/style.css` `:root`. Do not copy palettes into this file.

## Overlay filename contract

Expression states the overlay actually loads: `neutral_idle` (required), `{happy,sad,surprised}_{idle,speaking}`, `typing`, `eyes_closed`. Emotes live under `emotes/<name>/`. Creator Idle/Intro/Outro presets are not those keys.

## Do not use from the old dump

- Port 3000 for this app
- “OpenAI only”
- `.bat` as the primary launcher
- `H:\Git\devtools\…` workspace paths
- External `editor.css` / ASArtTool / Fugi Maker file:// links
