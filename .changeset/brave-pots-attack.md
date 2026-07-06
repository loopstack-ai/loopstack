---
'@loopstack/cli': minor
---

Human-in-the-loop prompts land in the terminal: when a followed run parks in waiting, the CLI finds the prompt (searching sub-workflows — the root often only holds a link document), renders it by widget type (`text-prompt` free text, `confirm-prompt` y/n, `choices` numbered with custom answers, `form` action buttons, plus a raw transition picker fallback), and submits the answer against the prompting workflow so the run resumes seamlessly. Non-interactive shells print the question and exit 3. New commands: `loopstack trace <runId>` renders the audit trail from checkpoints (consecutive state saves collapsed into steps with durations) and `--follow` live-attaches with the same prompt handling — including runs already waiting when you attach; `loopstack watch` streams the environment's events with `--workflow`/`--type` filters, as NDJSON under `--json`.
