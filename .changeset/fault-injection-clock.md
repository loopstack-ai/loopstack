---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/testing': minor
---

Fault injection and deterministic time for workflow tests: `failure(message?, status?)` scripts a failed/canceled sub-workflow callback as an answer — `errorPlace`/retry routing and inline `input.status === 'failed'` handling become reachable from ordinary tests, composing with `queue()`. The framework gains an injectable `Clock` (`CLOCK` token, `SystemClock` default) consumed by the transition-timeout race and trace timestamps; `runWorkflow`'s `clock` option accepts a `TestClock` (settable `now`, `advance(ms)`, `waitForScheduled()`) making transition timeouts testable without real waiting and trace timestamps reproducible.
