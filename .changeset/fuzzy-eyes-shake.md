---
'@loopstack/cli': minor
---

`loopstack run <workflow>` starts a run and follows it live: step lines per place with durations, LLM tokens streamed inline, and a final status line. `--arg key=value` (repeatable, JSON-ish coercion) and `--arg key=@file.json` supply workflow args; the workspace is resolved automatically (newest workspace of the workflow's app, created on demand) or pinned via `--workspace`. `--no-follow` fires and prints the run id; `--json` keeps stdout machine-readable (progress on stderr) and emits `{ workflowId, status, result, errorMessage, durationMs }`. Exit codes: 0 completed, 1 failed, 2 unknown workflow or connection problems, 3 waiting for input.
