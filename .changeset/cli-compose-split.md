---
"@loopstack/cli": minor
---

Scaffold splits infrastructure and Studio compose files

`loopstack create` now scaffolds a `docker-compose.yml` with **Postgres + Redis only** plus a separate,
optional `docker-compose.studio.yml` for the Studio UI. The `create` next-steps output and the generated
`README.md`/`CLAUDE.md` lead with running workflows from the CLI (the terminal-native path for CI and
coding agents) and treat Studio as an optional visual add-on.
