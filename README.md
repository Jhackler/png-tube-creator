# ⚔️ AS Adventurer Creator

**VTuber Creation Pipeline** — Linux-first hard fork of Angel's Sword Studios' AS Adventurer Creator.

Repo: [Jhackler/png-tube-creator](https://github.com/Jhackler/png-tube-creator)

*Design · Generate · Prepare · Export*

---

## What Is This?

A local 4-step pipeline: static sprite → optional AI video → loop prep → transparent WebM/GIF for streaming overlays.

This fork's focus is **Linux** (`launch.sh` TUI installer) plus extra image-API options. Windows launchers still exist from upstream; they are not the supported path here.

Companion overlay (separate repo): [Jhackler/Ai-png-tuber-overlay](https://github.com/Jhackler/Ai-png-tuber-overlay) on port **3000**. This creator listens on **3001**.

---

## Quick Start (Linux)

```bash
chmod +x launch.sh
./launch.sh            # install Node + deps if missing, then start
```

Browser: `http://localhost:3001`

### Linux launcher

`launch.sh` is a portable TUI launcher for Debian/Ubuntu, Fedora, and Arch (and most other glibc distros). Keep it in the repo root. Double-click from a file manager opens a terminal; close that window (or Ctrl+C) and the server dies with it.

```bash
chmod +x launch.sh
./launch.sh            # install Node + deps if missing, then start
./launch.sh setup      # install only
./launch.sh update     # git pull this clone, reinstall deps, start
./launch.sh start      # start only
```

It uses a system Node.js v18+ if you already have one. Otherwise it downloads an official portable Node runtime into `./runtime/` (no root required). `npm install` is skipped when dependencies are already present.

---

## The Pipeline

### ① Sprite Prep  🎨

**What it does:** Create or prepare a character sprite image on a solid chroma key background.

**Two modes:**
- **Upload Mode** — Drag in an existing character sprite (PNG with transparency). The tool places it on a colored background automatically.
- **Generate Mode** — Describe your character and generate a sprite via **OpenAI** or **OpenRouter** (Settings). OpenRouter's model list is filtered to image models that accept reference images.

**Key features:**
- Pick your chroma key color (magenta, green, blue, or custom)
- Adjust canvas size and sprite positioning
- Download the result as a PNG ready for animation

**Output:** A character sprite on a solid-color background (e.g., magenta), ready for Step 2.

---

### ② Generate Video  🎬

**What it does:** Turn your static sprite into an animated video using Google's Gemini AI.

> **💡 This step is optional.** If you already have an animated video from another tool (Veo, RunwayML, Kling, etc.), skip directly to Step 3.

**How to use:**
1. Your sprite from Step 1 is automatically carried over (or upload your own reference images)
2. Write a motion prompt describing the animation you want (e.g., "character gently breathing and blinking, idle animation")
3. Set the video length (3-10 seconds) and number of simultaneous generations
4. Click Generate — Gemini creates a short animated video

**Requirements:**
- A Google Gemini API key (set up in the Settings tab)
- Cost: approximately $0.10 per second of video

**Output:** A short animated video clip (MP4) of your character moving on the chroma key background.

---

### ③ Video Prep  🔄

**What it does:** Prepare your generated video for seamless looping and export.

**Key features:**
- **Frame Trimming** — Set in/out points to cut unwanted frames from the start or end
- **Loop Building** — Create seamless loops using:
  - **Ping-Pong** — Plays forward then backward for a natural bounce
  - **Reverse** — Plays the video in reverse
  - **Crossfade** — Blend the start and end frames for smooth transitions
- **Concatenation** — Combine multiple video clips together
- **Onion Skinning** — Overlay frame 0 at 50% opacity to help align loop points
- **Preview** — Scrub through frames and preview the final loop before exporting

**Output:** A prepared, looping video clip ready for chroma key removal in Step 4.

---

### ④ Model Exporter  📦

**What it does:** Remove the chroma key background and export as a transparent animated file.

**Export formats:**
| Mode | Format | Max Frames | Max Resolution |
|------|--------|------------|----------------|
| ⚔️ Adventurer | WebM (VP9 alpha) | Unlimited | Unlimited |
| 🟢 F. Normal | GIF | 120 frames | 1000×1000 |
| 💎 F. Premium | GIF | 600 frames | 4000×4000 |

**Chroma Key Controls:**
- **Key Color** — Pick or eyedrop the background color to remove
- **Similarity** — How close a pixel must be to the key color to be removed (default: 40%)
- **Smoothness** — How gradually edges transition from opaque to transparent (default: 8%)
- **Spill Suppression** — Remove color contamination from the key bleeding onto the character (default: 10%)

**Additional features:**
- Frame scrubber with play/pause for previewing
- Crop tool to trim the output
- Real-time preview with checkerboard transparency

**Output:** A transparent WebM or GIF file — ready to use in streaming overlays like AS Reactive Overlay, OBS, or any PNGtuber app.

---

## Settings  ⚙️

Access the Settings tab to configure:

- **Image API** — OpenAI (`gpt-image-2`) or OpenRouter (refreshable catalog, image+reference models only)
- **Matching API key** — OpenAI or OpenRouter, depending on the radio
- **Google Gemini API key** — Required for AI video generation (Step 2)

API keys stay in the browser's `localStorage`. They are only sent through the local proxy to the provider you picked.

> **💡 No API keys needed** if you bring your own sprite images and animated videos. Steps 3-4 work entirely offline.

---

## Using with AS Reactive Overlay

The assets you export are meant for the companion overlay ([Jhackler/Ai-png-tuber-overlay](https://github.com/Jhackler/Ai-png-tuber-overlay)):

1. Export transparent WebM (Adventurer mode) using the filename presets. Overlay **state** files are named like this (only `neutral_idle` is required):
   - `neutral_idle.webm` / `neutral_speaking.webm`
   - `happy_idle.webm` / `happy_speaking.webm` (same for `sad`, `surprised`)
   - `eyes_closed.webm`, `typing.webm`
   Creator also has Idle / Intro / Outro / Speaking / Animation presets (`{name}_idle`, `{name}_intro`, …) — those are for emotes/intros, not the overlay expression keys.
2. Drop files into the overlay repo's `public/assets/` or `public/assets/<ModelName>/`.
3. Overlay loads matching filenames as expression states.

The exported WebM files also work with any OBS browser source, PNGtuber app, or other streaming tools that support transparent video.

---

## System Requirements

- **OS:** Linux (Debian/Fedora/Arch and most glibc distros). `launch.sh` is the supported entry point.
- **Node:** v18+ on PATH, or a portable runtime downloaded into `./runtime/` (no root)
- **Browser:** Chrome, Firefox, or similar
- **Internet:** Only for AI steps (1–2). Steps 3–4 work offline.
- **Disk Space:** ~40 MB plus `./runtime/` if Node is bundled

---

## File Structure

```
png-tube-creator/
├── launch.sh                 ← Linux TUI: setup / update / start
├── server.js                 ← static files + API proxy (port 3001)
├── lib/image-provider/       ← OpenAI + OpenRouter adapters
├── HANDOFF.md                ← fork notes (not the upstream design dump)
├── public/
│   ├── index.html
│   ├── app.js / sprite-prep.js / video-gen.js / video-prep.js
│   ├── model-exporter.js
│   └── image-settings.js     ← OpenAI vs OpenRouter UI
└── Start AS Adventurer.bat   ← leftover Windows launcher
```

---

## Docs

- [`docs/layout.md`](docs/layout.md) — tabs, cards, tooltips, pipeline (stable)
- [`docs/theme.md`](docs/theme.md) — CSS variables; change these to recolor

---

## Tips & Tricks

- **Best chroma key results:** Use **magenta** (`#FF00FF`) as your key color — it rarely appears in character art.
- **Smooth loops:** Use Ping-Pong mode in Video Prep for the easiest seamless loops.
- **AI prompts:** Be specific about the motion you want. "Gentle idle breathing animation, slight hair movement" works better than "make it move."
- **Spill suppression:** If you see a colored fringe around your character after keying, increase the Spill Suppression slider.
- **WebM for streaming:** The Adventurer (WebM) format supports true alpha transparency and is ideal for OBS browser sources.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser doesn't open | Navigate manually to `http://localhost:3001` |
| Port 3001 in use | Close other instances or set `PORT` environment variable |
| AI sprite gen fails | Settings: correct provider radio + key; OpenRouter list only includes image+reference models |
| Video won't load | Try converting to MP4 (H.264) first — some codecs aren't supported |
| Export looks wrong | Adjust Similarity/Smoothness sliders — start with defaults |

---

## Credits

Upstream: **AS Adventurer Creator** by Angel's Sword Studios.

This hard fork: Linux launcher, OpenRouter image models, personal-use changes. Windows is not a target.
