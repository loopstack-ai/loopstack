---
'@loopstack/core': minor
'@loopstack/run-sub-workflow-example': minor
---

Add `FanOutWorkflow` and `SequenceWorkflow` coordination primitives for launching multiple sub-workflows in parallel or sequentially with a single aggregated callback. Both support `'all'` (fail-fast, cancel siblings / abort) and `'allSettled'` failure modes, and accept items as either an ordered array or a keyed record (results mirror the input shape). Auto-registered by `LoopstackModule` — inject and call like any other sub-workflow. Demonstrated in `run-sub-workflow-example` alongside the existing sequential single-child demo.
