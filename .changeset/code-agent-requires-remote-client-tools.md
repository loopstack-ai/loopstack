---
'@loopstack/code-agent': minor
---

`ExploreTask` now checks at boot that the `glob`, `grep` and `read` tools from `RemoteClientModule` are available. An app that imports `CodeAgentModule` without `RemoteClientModule` fails at startup with an error naming `RemoteClientModule`, instead of failing on the first `explore_task` call.
