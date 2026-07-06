---
'@loopstack/cli': minor
---

Run polish and Studio deep links: `--arg key=@-` reads the value from stdin, `run --quiet` prints only the final result, and environments can carry a Studio URL (`login` prompt / `--studio-url` / `LOOPSTACK_STUDIO_URL`, local fallback `http://localhost:5173`) — when known, detach output, waiting-for-input messages, failure output, and `runs --json` include deep links into Studio, and `--open` (on `run` and `runs <run-id>`) opens the run in the browser.
