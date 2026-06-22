---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/testing': minor
'@loopstack/agent': patch
'@loopstack/code-agent': patch
'@loopstack/git-module': patch
'@loopstack/github-integration': patch
'@loopstack/github-module': patch
'@loopstack/google-workspace-module': patch
'@loopstack/hitl': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/remote-client': patch
'@loopstack/secrets-module': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/sandbox-tool': patch
'@loopstack/accessing-tool-results-example-workflow': patch
'@loopstack/agent-example-workflow': patch
'@loopstack/chat-example-workflow': patch
'@loopstack/code-agent-example-workflow': patch
'@loopstack/custom-tool-example-module': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/dynamic-routing-example-workflow': patch
'@loopstack/error-retry-example-workflow': patch
'@loopstack/git-commit-flow-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/hitl-example-module': patch
'@loopstack/llm-multi-provider-example-workflow': patch
'@loopstack/mcp-linear-example-workflow': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/module-config-example': patch
'@loopstack/prompt-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/remote-file-explorer-example-workflow': patch
'@loopstack/run-sub-workflow-example': patch
'@loopstack/sandbox-example-workflow': patch
'@loopstack/secrets-example-workflow': patch
'@loopstack/test-ui-documents-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
'@loopstack/workflow-state-example-workflow': patch
---

Transitions return nothing and mutate workflow state and result via four setter methods on `BaseWorkflow`:

```ts
this.assignState(partial); // shallow merge into state
this.setState(full);       // replace state
this.assignResult(partial);// shallow merge into the published result
this.setResult(full);      // replace the published result
```

Setters are immediately visible to subsequent code in the same transition and are committed atomically with the existing per-transition DB transaction; on transition error the draft is discarded.

The published result (`WorkflowEntity.result`) is no longer derived from the final transition's return value — call `assignResult` / `setResult` from any transition to build it incrementally.

`@loopstack/testing` adds a `runTransition` helper that sets up an `ExecutionScope` around a transition invocation and returns the committed `{ state, result }` draft — the canonical way to unit-test a transition without going through the full processor.

**Breaking changes:**

- Transition methods return nothing. The processor throws if a transition returns a non-undefined value.
- `return { ...state, foo }`, `return state`, and `return {}` no longer drive state or result. Replace with `this.assignState({ foo })` (or delete the return for no-op patterns).
- The `to: 'end'` "return becomes result" shortcut is removed — final transitions that previously returned a result must call `this.setResult(...)`.
- Unit tests that invoke transitions directly must use `runTransition` from `@loopstack/testing` (or set up an `ExecutionScope` manually) — the previous "assert on the return value" pattern no longer works.

**Migration:**

```ts
// Before
@Transition({ to: 'next' })
async myTransition(state): Promise<MyState> {
  const result = await this.someTool.call(...);
  return { ...state, foo: result.data };
}

@Transition({ from: 'compute', to: 'end' })
async done(state): Promise<MyResult> {
  return this.buildResult(state);
}

// After
@Transition({ to: 'next' })
async myTransition(state) {
  const result = await this.someTool.call(...);
  this.assignState({ foo: result.data });
}

@Transition({ from: 'compute', to: 'end' })
done(state) {
  this.setResult(this.buildResult(state));
}
```

Omit the `: Promise<void>` annotation; drop `async` when the body has no `await`.

All registry features, examples, READMEs, and docs have been swept to the setter-based form. No backwards-compatibility shim — returning a value from a transition is a runtime error.
