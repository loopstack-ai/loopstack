---
"@loopstack/contracts": minor
"@loopstack/remote-client": minor
"@loopstack/git-module": minor
"@loopstack/remote-file-explorer-module": minor
"@loopstack/loopstack-studio": minor
---

Environment-specific Studio features with a slot selector

Workspace environments now carry a `status` (`running` / `stopped`) and can be targeted per slot:

- `EnvironmentService` gains `markRunning` / `markStopped` (upsert + toggle a slot instead of delete),
  and `resolveAgentUrl` prefers a running slot so a stopped one no longer shadows a live one.
- The file-explorer and git REST endpoints accept an optional `slotId` to target a specific environment.
- Studio adds an environment selector: file-explorer and git panels follow the chosen (running)
  environment — defaulting to and tracking the live one — instead of always the first.
