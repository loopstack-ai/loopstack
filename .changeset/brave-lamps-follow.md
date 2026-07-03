---
'@loopstack/api': minor
'@loopstack/loopstack-module': patch
---

Harden the SSE event stream for reconnecting and headless clients: every frame carries a monotonic sequence `id`, events are kept in a per-user replay buffer (bounded by size and TTL), reconnects with `Last-Event-ID` (or `?lastEventId=`) replay the missed tail — or receive a `stream.reset` event when the cursor is stale — heartbeat `ping` frames let non-browser clients detect dead connections, and `?workflowId=` filters the stream to a single run. Tuning knobs (`bufferSize`, `bufferTtlMs`, `heartbeatIntervalMs`) are exposed via the `sse` option on `LoopstackApiModule.register()` and `LoopstackModule.forRoot()`; `GET /sse/health` reports buffer stats.
