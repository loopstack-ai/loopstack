---
'@loopstack/cli': minor
---

New `@loopstack/cli` package — the `loopstack` terminal command over `@loopstack/client`. `loopstack login` saves named backend environments to `~/.loopstack/config.json` (written user-only; tokens optional — local no-auth backends need none), `loopstack env list|use` manages them, and `loopstack list` shows recent runs as a table or `--json`. Connection resolution precedence: `--url`/`--env`/`--token` flags, then `LOOPSTACK_URL`/`LOOPSTACK_TOKEN`, then the config default, then local dev fallback. Errors follow the CI exit-code contract (2 for connection/config problems) with friendly messages for unreachable backends and rejected tokens.
