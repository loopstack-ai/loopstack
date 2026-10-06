---
'@loopstack/loopstack-studio': minor
---

Add a `markdown-collapsed` form field: read-only Markdown behind a disclosure.

Detail that belongs on a form without being read every time — the full workings behind a decision, say — had
nowhere to go: `markdown-view` renders everything inline, and a raw `<details>` block in a Markdown string is
stripped, because the renderer runs no raw-HTML plugin. The field takes a `title` for the opener and an
optional `open` to start expanded, and renders nothing at all when its content is empty.
