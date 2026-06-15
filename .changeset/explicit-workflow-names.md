---
'@loopstack/agent': patch
'@loopstack/hitl': patch
'@loopstack/oauth-module': patch
'@loopstack/secrets-module': patch
'@loopstack/github-integration': patch
---

Add explicit `name` to `@Workflow()` decorators on framework-shipped workflows (`agent`, `chat_agent`, `ask_user`, `confirm_user`, `oauth`, `connect_github`, `secrets_request`). Names match the previously auto-derived snake_case identifiers, so no behavior changes for existing consumers — but the public name now lives in code instead of relying on class-name derivation, which makes it safe for downstream callers to reference these workflows by string from `FanOutWorkflow` / `SequenceWorkflow` items.
