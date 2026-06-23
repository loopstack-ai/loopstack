import { Inject, Injectable, Type } from '@nestjs/common';
import type { DocumentStore } from '../interfaces/document-store.interface.js';
import type { ExecutionScopeAccessor } from '../interfaces/execution-scope.interface.js';
import type { WorkflowOrchestrator } from '../interfaces/workflow-orchestrator.interface.js';
import { DOCUMENT_STORE, EXECUTION_SCOPE, TEMPLATE_RENDERER, WORKFLOW_ORCHESTRATOR } from '../tokens.js';
import type { TemplateRenderFn } from './workflow-templates.js';

/**
 * How a sub-workflow appears inside its parent's run view.
 *
 * - `'inline'` *(default)* — the child is rendered inline as an embedded iframe.
 *   Use for interactive children (HITL, OAuth flows).
 * - `'link'` — the child appears as a status link card in the parent's stream;
 *   clicking opens it in a separate window. Use for autonomous children the
 *   user only needs to track.
 * - `'hidden'` — no UI is added to the parent's stream. Use for background
 *   fan-out where surfacing each child would be noise.
 */
export type SubWorkflowShow = 'inline' | 'link' | 'hidden';

export interface RunOptions {
  callback?: { transition: string; metadata?: Record<string, unknown> };
  show?: SubWorkflowShow;
  label?: string;
}

/**
 * Returned by `BaseWorkflow.run()` when queuing a sub-workflow.
 *
 * The parent does NOT wait for the child to finish — `run()` schedules the
 * child and returns immediately. Use the `workflowId` to correlate the
 * eventual callback (the transition named in `options.callback.transition`),
 * or to query the child's status via the API.
 */
export interface QueueResult {
  /** ID of the queued child workflow run. */
  workflowId: string;
}

/**
 * Shape delivered to every `@Transition({ wait: true })` method, regardless of trigger source
 * (sub-workflow completion or frontend / API resume).
 *
 * The `schema` option on `@Transition` validates `data` only — the framework constructs the
 * surrounding envelope. `meta` carries whatever the parent passed to `callback.metadata`
 * (used by `FanOut`/`Sequence` for per-child correlation, by the LLM tool loop for
 * `toolUseId`, etc.); it is `undefined` for user-driven resumes.
 *
 * `hasError` / `errorMessage` / `status` reflect the terminal state of the trigger so the
 * receiver can branch on failure without separate lookups.
 */
export interface TransitionInput<TData = unknown, TMeta = unknown> {
  workflowId: string;
  status: 'completed' | 'failed' | 'canceled';
  hasError: boolean;
  errorMessage: string | null;
  data: TData;
  meta?: TMeta;
}

/**
 * Abstract base class for workflows.
 *
 * Generic parameters:
 * - `TArgs` — the **storage contract**: what is validated, persisted, and arrives in `ctx.args`
 *   inside transitions (via `ctx: RunContext<TArgs>`).
 * - `TInput` — the **call-site contract**: what callers pass to `run(input)`. Defaults to `TArgs`,
 *   so workflows whose call shape equals their storage shape only need a single generic.
 *
 * The two diverge when the workflow's `@Workflow({ schema })` is a transforming zod schema
 * (`schema.transform(input => args)`). In that case, infer the types from the schema:
 *   `BaseWorkflow<z.output<typeof Schema>, z.input<typeof Schema>>`.
 *
 * State and result are mutated via setters, never via the return value:
 * - `this.assignState(partial)` — shallow-merge into state
 * - `this.setState(full)` — replace state
 * - `this.assignResult(partial)` — shallow-merge into result
 * - `this.setResult(full)` — replace result
 *
 * Transitions return nothing. Returning a non-undefined value throws at runtime.
 * Use `async` only when the body awaits. Setters are immediately visible to
 * subsequent code in the same transition; on error, the framework discards the
 * draft as part of the transition rollback.
 *
 * Workflows are singletons. State flows through the `state` parameter:
 * - All transitions receive `(state, ctx)` and return nothing
 * - Wait transitions receive `(state, payload, ctx)` and return nothing
 * - `ctx` is optional (trailing param can be omitted)
 * - Args are available via `ctx.args` — type with `RunContext<TArgs>` to drop the cast
 * - Use `from: 'start'` (or omit `from`) for initial, `to: 'end'` for final
 *
 * Launch sub-workflows via `run()`:
 * ```ts
 * constructor(
 *   private agentWorkflow: AgentWorkflow,
 * ) { super(); }
 *
 * await this.agentWorkflow.run(
 *   { system: '...', userMessage: '...' },
 *   { callback: { transition: 'onComplete' } },
 * );
 * ```
 */
@Injectable()
export abstract class BaseWorkflow<TArgs = Record<string, unknown>, TInput = TArgs> {
  /** @internal — injected by the framework. Routes run() through the orchestrator. */
  @Inject(WORKFLOW_ORCHESTRATOR) private readonly __orchestrator!: WorkflowOrchestrator;

  /** @internal — injected by the framework. Provides per-transition draft access. */
  @Inject(EXECUTION_SCOPE) private readonly __executionScope!: ExecutionScopeAccessor;

  /** Document store for saving and retrieving workflow documents. */
  @Inject(DOCUMENT_STORE) protected readonly documentStore!: DocumentStore;

  /**
   * Render a Handlebars template file with optional data context.
   *
   * Pass an absolute path — typically `path.join(__dirname, 'templates', 'foo.md')`.
   */
  @Inject(TEMPLATE_RENDERER) protected readonly render!: TemplateRenderFn;

  /**
   * Launch this workflow as a sub-workflow.
   *
   * @param input — Call-site input, validated and transformed by `@Workflow({ schema })` into `TArgs`
   * @param options — Optional callback to resume the parent workflow when this one completes
   */
  async run(input?: TInput, options?: RunOptions): Promise<QueueResult> {
    return this.__orchestrator.queue(this.constructor as Type, input as Record<string, unknown>, options);
  }

  /**
   * Shallow-merge `partial` into the workflow's state. The change is visible
   * to subsequent code in the same transition and committed on transition success.
   */
  protected assignState(partial: Record<string, unknown>): void {
    Object.assign(this.__executionScope.get().stateDraft, partial);
  }

  /**
   * Replace the workflow's state with `next`. Use for an explicit full-reset;
   * prefer `assignState` for incremental changes.
   */
  protected setState(next: Record<string, unknown>): void {
    const draft = this.__executionScope.get();
    draft.stateDraft = { ...next };
  }

  /**
   * Shallow-merge `partial` into the workflow's result. The result can be built
   * up incrementally across any transitions; the final value is persisted to
   * `WorkflowEntity.result` and returned via the API.
   */
  protected assignResult(partial: Record<string, unknown>): void {
    const draft = this.__executionScope.get();
    Object.assign(draft.resultDraft, partial);
    draft.resultDirty = true;
  }

  /**
   * Replace the workflow's result with `next`. Use for an explicit full-reset;
   * prefer `assignResult` for incremental changes.
   */
  protected setResult(next: Record<string, unknown>): void {
    const draft = this.__executionScope.get();
    draft.resultDraft = { ...next };
    draft.resultDirty = true;
  }
}
