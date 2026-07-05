---
'@loopstack/cli': minor
---

Studio handoff round-trip for human-in-the-loop prompts: the CLI stays attached while a prompt is open, so an answer given in Studio aborts the terminal prompt (`✓ answered in Studio`) and following resumes — for reattached sessions too. Forms with input fields hand off to Studio via deep link instead of submitting an empty payload; without a Studio URL, or with `--editor`, the payload opens in `$EDITOR` (schema-seeded JSON, reopened on invalid input). Ctrl+D on an open prompt now exits 3 instead of crashing.
