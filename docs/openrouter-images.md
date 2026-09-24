# OpenRouter image models

Settings radios: **OpenAI** (GPT Image 2) and **OpenRouter** (refreshable list of models that generate images and accept references).

The same model list is on Sprite Prep → AI Generate. Changing either select updates the other. Switching provider is Settings only.

Server adapter: `lib/image-provider/`.

OpenRouter: `GET /models` + `POST /images` with `input_references`.
OpenAI direct: `/images/generations` and multipart `/images/edits`.
Gemini video is separate (`/api/video/generate`).
