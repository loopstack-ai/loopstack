---
'@loopstack/common': patch
'@loopstack/core': patch
---

A run interrupted in the middle of its auto-transitions continues instead of staying `running` forever.

- A task without a transition continues the run from its current place. A task BullMQ redelivers after its process
  died picks the run up at its latest checkpoint, re-running the transition that was cut off; a run parked on a wait
  transition settles back to `waiting`.
- On shutdown (`app.enableShutdownHooks()`), runs stop before their next transition and queue a continuation; the
  worker closes once its active jobs have returned, before the database connection goes away.
- A job the queue gives up on — out of attempts or stalled too often — fails its run at the place it reached, so the
  parent is called back and a manual retry re-enters it.
