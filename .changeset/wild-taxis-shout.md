---
'@loopstack/client': minor
---

Add the live event stream to `@loopstack/client`: `client.stream` (a `LoopstackStream`) subscribes to the backend's SSE endpoint with ref-counted lifecycle (first subscriber connects, last closes), exponential-backoff reconnects that resume via `Last-Event-ID`, a heartbeat watchdog for dead-connection detection, typed `on(type, handler)` callbacks and an async-iterator `events({ workflowId })` API, with unknown event types passed through for forward compatibility. Also ships `resolveInvalidations(event, envKey)` — the pure event→query-key invalidation map — and `reduceLlmStream`, a pure reducer accumulating `llm.response.*` token streams per message.
