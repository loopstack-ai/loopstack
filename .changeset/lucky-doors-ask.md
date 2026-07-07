---
'@loopstack/cli': minor
---

`loopstack list <workflow>` shows what a workflow expects: description, owning app, an arguments table (name, type, required, default — from the workflow's zod schema), and a copy-pasteable `run` example. `--json` returns the raw schema.
