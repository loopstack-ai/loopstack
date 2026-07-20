---
'@loopstack/cli': minor
---

The terminal is a first-class client for human-in-the-loop runs:

- **Unified widget registry** — one registry drives both rendering and interaction (`render`/`collect` per widget); what the CLI can answer is exactly what has a collect implementation. Message, markdown, error, link, form, and JSON-fallback rendering; text/confirm/choices prompts, chat inputs, buttons, and forms as interactive widgets.
- **Forms are picker-first** — content renders, actions submit it directly (Studio-equivalent), `e` opens the complete content JSON in `$EDITOR`. Field order and labels follow Studio (widget config over schema); `readonly: true` fields have local edits discarded with a warning.
- **`loopstack attach <run-id>`** — rejoin a run like `docker attach`: full transcript, then live streaming and prompts. `runs <run-id>` prints the complete transcript (documents of the whole run tree, chronological, railed by nesting).
- **Secret entry** (`secret-input`) — values collected without echo (already-stored keys keep on enter), stored via the workspace secrets API, never in the transcript or transition payload.
- **Honest waits, never hangs** — a wait on input the CLI can't collect is named explicitly (e.g. `waiting for browser sign-in (google) — open the sign-in link above`) with a Studio link; interactive sessions stay attached so browser round-trips (OAuth) resume automatically; non-interactive shells exit 3. Parked sub-workflows no longer read as "still processing".
- **Interactive retry** — failed runs offer `r. retry` (Studio's Retry equivalent) and surface error-place recovery buttons in the same prompt.
- **Live tool calls** — `⚒ name {args}` streams during the turn (deduped against the persisted message), railed by sub-workflow depth; `show: 'hidden'` children render nothing, like Studio.
- Prompt matching follows Studio's rules: documents active at the workflow's current place (or `meta.enableAtPlaces`), interactive when a declared transition is available.
- **Multi-prompt sequences work end to end** — when sub-workflows ask one question after another while the root stays parked on its callback (e.g. `connect_github`), the idle hook re-arms after each answer, so every follow-up prompt is discovered without needing a root status change.
