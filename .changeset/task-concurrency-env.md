---
'@loopstack/core': minor
---

Read the task processor's concurrency from `TASK_CONCURRENCY`, and export the resolved value.

How many tasks a process runs at once is a budget applications have to plan against rather than an internal
detail: a workflow that occupies a task for its whole lifetime — a long-running agent session, say — holds
one of those slots for that long, so an application running several of them at once needs to know how many
exist and leave headroom for everything else in the process. The variable sets it, defaulting to 10, and
`TASK_CONCURRENCY` is exported from `@loopstack/core` so that headroom can be asserted at boot.
