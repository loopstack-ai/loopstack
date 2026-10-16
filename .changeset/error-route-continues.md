---
'@loopstack/common': minor
'@loopstack/core': minor
---

A failure is recorded and routed, and whether the run carries on from its `errorPlace` is decided by that place. A place offering an automatic transition runs it, so a run that must give something back cleans up without waiting for anybody. A place offering only `wait: true` transitions parks, and the run reads as failed while it stands there, which is how a recovery point works.

The transition that handles the failure is told why it is there through `ctx.execution.error`, beside `place` and `retryCount`. It is also set for a transition being retried in place, so a body can tell a first attempt from a recovery without keeping a flag in state. A transition that gets through clears it, so a run that handles a failure and reaches `end` completes with nothing on its error.

One pass is the automatic work a run does between two manual steps. A pass may run 1000 transitions; beyond that the run stops as failed, naming the last ten transitions, so a cycle that never yields is reported instead of spinning. Raise it with `MAX_TRANSITIONS_PER_PASS`.

A place meant for a person to act on declares `wait: true` on its transitions.
