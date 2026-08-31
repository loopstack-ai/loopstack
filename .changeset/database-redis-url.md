---
"@loopstack/loopstack-module": minor
"@loopstack/core": minor
---

Connection URLs and a Postgres/Redis-only default compose file

- `LoopstackModule.forRoot()` now honors a single `DATABASE_URL` (passed to TypeORM as `url`) when set and
  no programmatic `database` options are given; the discrete `DATABASE_*` vars remain as fallback. The core
  task queue likewise honors `REDIS_URL`, falling back to `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`. This
  makes managed/hosted environments (and any "bring your own instance" setup) a first-class configuration
  path.
- The shipped `docker-compose.yml` now starts **Postgres + Redis only**; Studio moved to a separate,
  optional `docker-compose.studio.yml`. The combined `docker-compose.infra.yml` is removed (the default is
  now infra-only).
