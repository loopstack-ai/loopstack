---
'@loopstack/core': patch
---

The task-queue worker tolerates a few stalled attempts before BullMQ fails a job permanently (`maxStalledCount: 3`). A job stalls when its process dies mid-transition (a crash or a non-graceful deploy); the previous default of 1 killed a run on its second interruption. Pair with `app.enableShutdownHooks()` in your `main.ts` so in-flight transitions finish on SIGTERM instead of stalling.
