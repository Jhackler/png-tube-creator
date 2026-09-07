# OpenRouter Image + References — Design

See the full design in this file. Branch: `feat/openrouter-images`.

Two Settings radios: **OpenAI** (static GPT Image 2) and **OpenRouter** (refreshable list of models that generate images and accept references). Phase 1 AI Generate reads that choice from localStorage.

Server adapter lives in `lib/image-provider/`.

OpenRouter: `GET /models` + `POST /images` with `input_references`.
OpenAI direct: `/images/generations` and multipart `/images/edits`.
Gemini video is out of scope.
