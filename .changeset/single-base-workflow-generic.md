---
'@loopstack/agent': patch
'@loopstack/common': patch
'@loopstack/github-integration': patch
'@loopstack/github-module': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/sandbox-tool': patch
'@loopstack/secrets-module': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/agent-examples': patch
'@loopstack/filesystem-examples': patch
'@loopstack/hitl-examples': patch
'@loopstack/llm-examples': patch
'@loopstack/oauth-examples': patch
'@loopstack/secrets-examples': patch
---

`BaseWorkflow` is now single-generic — `BaseWorkflow<TArgs>`. The unused `_TState` second generic has been removed; state is typed per-transition on the `state` parameter. Author convention for typing `ctx.args` is now `ctx: RunContext<FooArgs>` (derived from a `type FooArgs = z.infer<typeof FooSchema>` alias), removing the previously-required `const args = ctx.args as { ... }` cast. All examples, registry workflows, and docs updated.
