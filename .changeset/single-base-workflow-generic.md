---
'@loopstack/common': patch
'@loopstack/agent': patch
'@loopstack/oauth-module': patch
'@loopstack/secrets-module': patch
'@loopstack/github-integration': patch
'@loopstack/github-module': patch
'@loopstack/mcp-module': patch
'@loopstack/sandbox-tool': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/accessing-tool-results-example-workflow': patch
'@loopstack/custom-tool-example-module': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/dynamic-routing-example-workflow': patch
'@loopstack/error-retry-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/llm-multi-provider-example-workflow': patch
'@loopstack/mcp-linear-example-workflow': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/prompt-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/remote-file-explorer-example-workflow': patch
'@loopstack/sandbox-example-workflow': patch
'@loopstack/secrets-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
'@loopstack/workflow-state-example-workflow': patch
---

`BaseWorkflow` is now single-generic — `BaseWorkflow<TArgs>`. The unused `_TState` second generic has been removed; state is typed per-transition on the `state` parameter. Author convention for typing `ctx.args` is now `ctx: RunContext<FooArgs>` (derived from a `type FooArgs = z.infer<typeof FooSchema>` alias), removing the previously-required `const args = ctx.args as { ... }` cast. All examples, registry workflows, and docs updated.
