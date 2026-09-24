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

## Projects

Left column. This is how files land in a folder instead of a one-off browser download.

1. Paste an absolute path and click **Use path**. That only opens the folder. It does not create a character. Brave blocks the folder picker, so the path field is the real control.
2. **New character** makes a subdirectory and fills the Sprite Prep name. Clicking a name in the list does the same.
3. Typing a name in Sprite Prep and sending the sprite or video on also creates that folder if it is missing. An existing folder is not rewritten.
4. When a project is open and the write succeeds, there is no download dialog.

```
/mnt/projects1/Vtubing/projects/
  Mira_Vale/
    ready.txt                 ← write check, overlay ignores it
    sprite/sent_YYYYMMDD_HHMMSS.png
    sprite/gen_1.png
    video/source.mp4          ← replaced if you send the video on again
    video/gen_1.mp4
    neutral_idle.webm
    happy_speaking.webm
    extras/intro.webm
```

Spaces in a name become underscores (`Mira Vale` → `Mira_Vale`). Copy that character folder into the overlay's `public/assets/` and the model name is the folder.

Sending a sprite on asks before writing a new `sprite/sent_….png`. Skipping that save still creates the character folder. Overlay clips use the selector names (`neutral_idle.webm`), not `mira_Neutral_Idle.webm`. Intro, outro, and animation go in `extras/` because the overlay does not load those as expression states.

Quit the app and start `launch.sh` again after pulling this branch. A page refresh does not load new save routes.

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
- Download the result as a PNG, or save it into the open project (see [Projects](#projects))

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

**Output:** A transparent WebM or GIF. With a project open, overlay presets save as `Character/neutral_idle.webm` (and the other selector names). Without a project, the browser download still prefixes the character name so files in Downloads do not collide.

---

## Settings  ⚙️

Access the Settings tab to configure:

- **Image API** — OpenAI (`gpt-image-2`) or OpenRouter. The same model list is on the Sprite Prep generate page. Changing either select updates the other. Provider (OpenAI vs OpenRouter) still switches only in Settings.
- **Matching API key** — OpenAI or OpenRouter, depending on the radio
- **Google Gemini API key** — Required for AI video generation (Step 2)

API keys stay in the browser's `localStorage`. They are only sent through the local proxy to the provider you picked.

> **💡 No API keys needed** if you bring your own sprite images and animated videos. Steps 3-4 work entirely offline.

---

## Using with AS Reactive Overlay

The assets you export are meant for the companion overlay ([Jhackler/Ai-png-tuber-overlay](https://github.com/Jhackler/Ai-png-tuber-overlay)):

1. Export transparent WebM (Adventurer mode). With a project open, the filename buttons are the overlay names. Only `neutral_idle` is required:
   - `neutral_idle.webm` / `neutral_speaking.webm`
   - `happy_idle.webm` / `happy_speaking.webm` (same for `sad`, `surprised`)
   - `eyes_closed.webm`, `typing.webm`
2. Copy the character folder (`Project/Mira_Vale/`) into the overlay repo's `public/assets/`. Extra files (`sprite/`, `video/`, `ready.txt`, `extras/`) are ignored.
3. The overlay loads matching filenames as expression states. The model name is the folder name.

The exported WebM files also work with any OBS browser source, PNGtuber app, or other streaming tools that support transparent video.

---

## System Requirements

- **OS:** Linux (Debian/Fedora/Arch and most glibc distros). `launch.sh` is the supported entry point.
- **Node:** v18+ on PATH, or a portable runtime downloaded into `./runtime/` (no root)
- **Browser:** Chrome, Firefox, or similar. Brave blocks the folder picker; use the path field.
- **Internet:** Only for AI steps (1–2). Steps 3–4 and project saves work offline once the local server is running.
- **Disk Space:** ~40 MB plus `./runtime/` if Node is bundled

---

## File Structure

```
png-tube-creator/
├── launch.sh                 ← Linux TUI: setup / update / start
├── server.js                 ← static files + API proxy (port 3001)
├── lib/image-provider/       ← OpenAI + OpenRouter adapters
├── lib/project-paths.js      ← character folder + overlay filename rules
├── lib/project-write.js      ← open / create / list / save on disk
├── HANDOFF.md                ← fork notes (not the upstream design dump)
├── public/
│   ├── index.html
│   ├── app.js / sprite-prep.js / video-gen.js / video-prep.js
│   ├── model-exporter.js
│   ├── image-settings.js     ← OpenAI vs OpenRouter UI
│   └── lib/project-store.js  ← browser side of the projects column
└── test/                     ← node:test for names, paths, image helpers
```

---

## Docs

- [`docs/layout.md`](docs/layout.md) — tabs, projects column, tooltips, pipeline
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
| Project folder will not open | Path must be absolute and already exist. Restart `launch.sh` after pulling so `/api/project/open` exists |
| Character missing from the list | Hard-refresh. Sending a sprite on creates the folder; the list should update without a reload |
| Export still opens a download dialog | No project is open, or the server write failed. The reason stays in the projects column |

---

## Credits

Upstream: **AS Adventurer Creator** by Angel's Sword Studios.

This hard fork: Linux launcher, OpenRouter image models, personal-use changes. Windows is not a target.
