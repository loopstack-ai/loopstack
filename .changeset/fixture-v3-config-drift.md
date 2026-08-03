---
'@loopstack/testing': minor
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/client': minor
'@loopstack/cli': patch
---

Replay fixture format v3 — config drift detection: fixture entries capture the call's validated `config` as assertion metadata alongside `args`, so a changed system prompt, model, or tool list fails the replayed test instead of silently passing against a stale fixture. Config is captured at both capture points (`ToolExecutionContext.config` for in-process recording — visible to all tool interceptors — and the `config` field on tool trace events for `loopstack runs --record`). Version 2 fixtures are rejected with a re-record message; hand-written entries that omit `config` don't assert it.
