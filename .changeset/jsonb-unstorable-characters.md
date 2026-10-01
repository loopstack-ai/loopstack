---
'@loopstack/common': patch
'@loopstack/core': patch
---

Every `jsonb` column scrubs what Postgres cannot store.

Postgres `jsonb` is backed by its text type, which can represent neither U+0000 nor an unpaired UTF-16
surrogate — an insert carrying either is rejected with `unsupported Unicode escape sequence`. Such a
character never comes from the engine itself; it arrives with the content a run handles, from a tool that
read a binary file, a subprocess whose output was not valid UTF-8, or an LLM transcript quoting either of
those. What it costs is a whole run rather than one document: the rejected insert fails the transition that
wrote it, and the retry replays the same content, so the run cannot get past it.

- `@loopstack/common`: `sanitizeForJsonb()` and `JsonbTransformer` drop U+0000 and replace a lone surrogate
  with U+FFFD. The transformer is applied to every `jsonb` column — a document's `content`, `meta` and
  validation error, a workflow's `args`, `context`, `result`, `callbackMetadata` and `availableTransitions`,
  a checkpoint's `state`, and a run-trace event's `payload` — so neither a saved document nor the state a
  transition assigns can carry one. A value with nothing to scrub reaches the driver untouched.
- `@loopstack/core`: a document whose write the database rejects is named in the log — document name, key,
  transition and workflow — next to the error, which by itself reports only the column it violated.
