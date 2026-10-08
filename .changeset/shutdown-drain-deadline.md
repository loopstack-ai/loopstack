---
'@loopstack/core': patch
---

A graceful shutdown no longer waits indefinitely for a run inside a long transition.

- The drain waits at most `SHUTDOWN_DRAIN_TIMEOUT_MS` (default 30 seconds, read at shutdown time) for in-flight runs
  to yield, then closes the worker by force. The jobs still running are redelivered after restart and re-run their
  interrupted transition from its checkpoint — the same recovery a crash takes.
- A second `SIGINT`/`SIGTERM` during the drain forces the close at once, so a second Ctrl+C stops the process.
- The drain logs which runs it is waiting for and when it will force.
