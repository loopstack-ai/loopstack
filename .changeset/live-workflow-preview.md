---
"@loopstack/loopstack-studio": minor
"@loopstack/remote-client": minor
"@loopstack/contracts": minor
"@loopstack/core": minor
"@loopstack/client": minor
---

Live workflow preview in Studio. The preview panel now follows a running app's dynamic connection URL and only lists environments that are actually running: `WorkspaceEnvironmentDto` exposes `status`, `EnvironmentService.markRunning` records the app URL as `connectionUrl` (and no longer defaults it to the agent URL) while `markStopped` clears it. A new `environment.updated` workspace event — dispatched by `EnvironmentService` and the environment controller — invalidates the workspace-environments query via the live event stream, so the panel updates to the new URL (and drops torn-down slots) without a page reload.
