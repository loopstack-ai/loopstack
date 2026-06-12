---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/loopstack-studio': minor
'@loopstack/github-integration': patch
'@loopstack/code-agent': patch
'@loopstack/hitl': patch
'@loopstack/secrets-module': patch
'@loopstack/agent-example-workflow': patch
'@loopstack/code-agent-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/hitl-ask-user-example-workflow': patch
'@loopstack/hitl-confirm-example-workflow': patch
'@loopstack/mcp-linear-example-workflow': patch
'@loopstack/run-sub-workflow-example': patch
---

Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

`BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:

- `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
- `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
- `'hidden'` — no save. Right for fan-out / background work.

The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.
