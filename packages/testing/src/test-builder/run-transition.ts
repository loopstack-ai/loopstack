import type { DocumentEntity } from '@loopstack/common';
import { ExecutionScope, type ExecutionScopeData } from '@loopstack/core';

/** What `runTransition` returns: the state and result drafts after the transition resolves. */
export interface TransitionDraftResult<TState = Record<string, unknown>, TResult = Record<string, unknown>> {
  /** The committed state draft after the transition. Always defined — defaults to the seeded initial state. */
  state: TState;
  /** The committed result draft if `assignResult` / `setResult` was called; otherwise `null`. */
  result: TResult | null;
}

/**
 * Options to seed the scope before invoking the transition. All optional.
 */
export interface RunTransitionOptions<TState = Record<string, unknown>, TResult = Record<string, unknown>> {
  /** Seed value for the state draft. Visible to `state` reads inside the transition. */
  state?: TState;
  /** Seed value for the result draft. */
  result?: TResult | null;
  /** Override scope context (userId, workspaceId, workflowId, args, labels). */
  scope?: Partial<Pick<ExecutionScopeData, 'userId' | 'workspaceId' | 'workflowId' | 'labels' | 'args' | 'options'>>;
}

interface InternalWorkflow {
  __executionScope?: ExecutionScope;
}

/**
 * Run a transition method against a workflow inside an ALS scope and return
 * the committed state and result drafts.
 *
 * Use this in unit tests where you instantiate the workflow directly (`new MyWorkflow(...)`)
 * rather than via the NestJS testing module. The helper attaches a fresh `ExecutionScope`
 * to the workflow if one isn't already injected, then mirrors what the processor does
 * around a transition invocation:
 * - Seeds `stateDraft` / `resultDraft` from `options.state` / `options.result`.
 * - Runs `invoke` inside `executionScope.run(scopeData, ...)`.
 * - Reads back the drafts after `invoke` resolves.
 *
 * ```ts
 * const { state, result } = await runTransition(
 *   workflow,
 *   () => workflow.start(initialState, ctx),
 *   { state: initialState },
 * );
 * expect(state.currentIndex).toBe(0);
 * ```
 *
 * Note: this helper does NOT enforce the void-return contract — tests can ignore
 * the transition's resolved value. In production the processor throws on non-undefined
 * returns; here we leave that check to the integration-level path.
 */
export async function runTransition<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TResult extends Record<string, unknown> = Record<string, unknown>,
>(
  workflow: object,
  invoke: () => unknown | Promise<unknown>,
  options: RunTransitionOptions<TState, TResult> = {},
): Promise<TransitionDraftResult<TState, TResult>> {
  const internal = workflow as InternalWorkflow;

  // Attach a real ExecutionScope to the workflow if one isn't already injected
  // (e.g. when the test uses `new MyWorkflow(...)` bypassing NestJS DI).
  if (!internal.__executionScope) {
    internal.__executionScope = new ExecutionScope();
  }
  const scope = internal.__executionScope;

  const scopeData: ExecutionScopeData = {
    userId: options.scope?.userId ?? 'test-user',
    workspaceId: options.scope?.workspaceId ?? 'test-workspace',
    workflowId: options.scope?.workflowId ?? 'test-workflow',
    labels: options.scope?.labels ?? [],
    args: options.scope?.args,
    options: options.scope?.options ?? { stateless: false },
    cache: new Map(),
    queryRunner: null,
    documents: [] as DocumentEntity[],
    persistenceState: { documentsUpdated: false },
    transition: undefined,
    stateDraft: { ...(options.state ?? {}) },
    resultDraft: { ...(options.result ?? {}) },
    resultDirty: false,
  };

  await scope.run(scopeData, async () => {
    await invoke();
  });

  return {
    state: scopeData.stateDraft as TState,
    result: scopeData.resultDirty ? (scopeData.resultDraft as TResult) : null,
  };
}
