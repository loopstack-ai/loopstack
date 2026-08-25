---
'@loopstack/cli': minor
---

Non-interactive HITL answering for agents and scripts: new `loopstack answer <run-id>` command (`--arg` / `--payload` / `--transition`), a machine-readable `pendingPrompt` (description, schema, transition) in `runs <run-id> --json`, and `runs <run-id> --record <file>` to derive replay fixtures from a run's recorded tool calls. The scaffolded CLAUDE.md teaches the run → exit 3 → read prompt → answer loop.
