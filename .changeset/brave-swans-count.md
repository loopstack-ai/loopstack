---
'@loopstack/cli': minor
---

Command grammar alignment: `runs` lists recent runs with waiting-for-input runs surfaced first (`--search`, `--status`, `--workspace`, `--limit`) and `runs <run-id>` shows a run's audit trail (`--follow` reattaches live and answers prompts, replacing `trace`); `list` now shows the workflows you can run in the environment; `run --detach` replaces `--no-follow`.
