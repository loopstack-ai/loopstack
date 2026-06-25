---
'@loopstack/common': patch
'@loopstack/core': patch
---

`BaseWorkflow<TArgs, TInput = TArgs>` now exposes a second generic for workflows whose call-site shape differs from their persisted shape. Normalization moves into a zod `.transform()` on the workflow's schema; the run-args parse pipeline now runs once at the boundary (queue or stateless entry) instead of twice. `FanOutWorkflow` and `SequenceWorkflow` use this pattern — their `run()` overrides and `as unknown as` casts are gone.
