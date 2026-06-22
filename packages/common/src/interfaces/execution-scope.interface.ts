/**
 * Subset of the framework's per-transition execution scope that `BaseWorkflow`
 * needs to access from across the package boundary. The concrete implementation
 * lives in `@loopstack/core`'s `ExecutionScope` service and is bound to the
 * `EXECUTION_SCOPE` token; it exposes a richer object than this interface.
 *
 * Used to expose the state/result drafts so that `assignState` / `setState` /
 * `assignResult` / `setResult` on `BaseWorkflow` can mutate them.
 */
export interface ExecutionScopeAccessor {
  get(): ExecutionScopeDraft;
  getOptional(): ExecutionScopeDraft | undefined;
}

export interface ExecutionScopeDraft {
  stateDraft: Record<string, unknown>;
  resultDraft: Record<string, unknown>;
  resultDirty: boolean;
}
