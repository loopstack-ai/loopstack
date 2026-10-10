---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/loopstack-module': minor
'@loopstack/oauth-module': minor
'@loopstack/quota': minor
---

A Redis database per deployment, and a clear error when two share one.

- `resolveRedisConnection()` in `@loopstack/common` is the one place Redis settings are resolved, for the
  task queue, the OAuth token and session stores, and the quota counters. Precedence: explicit options,
  `REDIS_URL`, the discrete `REDIS_*` vars, then `localhost:6379` on database `0`.
- `redis.db` / `REDIS_DB` selects the database, and a `REDIS_URL` path now sets it — `redis://host:6379/2`
  resolves to database `2` instead of being ignored.
- `QuotaModule.forRoot` resolves its connection the same way, so it honors `REDIS_URL` like everything
  else; `forRootAsync` reads `QUOTA_REDIS_DB`.
- A worker handed a workflow its deployment never registered refuses the job as an `UnrecoverableError`
  instead of retrying three times. The run fails immediately, and its error states that two deployments
  are sharing the Redis database and its `task-queue`, and that each needs its own.
- `WorkflowRegistryService` gains `hasName()` and `names()`.
