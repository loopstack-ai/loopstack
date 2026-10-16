import { Inject, Injectable, Type } from '@nestjs/common';
import type { DocumentStore } from '../interfaces/document-store.interface.js';
import type { ExecutionScopeAccessor } from '../interfaces/execution-scope.interface.js';
import type { WorkflowOrchestrator } from '../interfaces/workflow-orchestrator.interface.js';
import { DOCUMENT_STORE, EXECUTION_SCOPE, TEMPLATE_RENDERER, WORKFLOW_ORCHESTRATOR } from '../tokens.js';
import { WorkflowFailure } from './workflow-failure.js';
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

/**
 * How a parent is called back when a sub-workflow ends.
 *
 * `onSuccess` names the wait transition that receives a completed child's result as a {@link TransitionInput};
 * the transition's `schema` validates it. `onFailure` names the wait transition that receives a failed or
 * canceled child as a {@link FailureInput}. Either may be omitted:
 *
 * - no `onSuccess`: a completed child calls nothing back.
 * - no `onFailure` with an `onSuccess`: a failed child parks the parent at the place it waits at, as failed,
 *   with the child's error message. The child keeps its Retry, and a retried child that then succeeds finds
 *   the parent still waiting and calls `onSuccess`.
 * - neither: nothing is called back, whatever happened.
 *
 * `metadata` is carried into both callbacks as `meta`, for correlation such as a fan-out key or a tool-use id.
 */
export interface RunOptions {
  onSuccess?: { transition: string };
  onFailure?: { transition: string };
  metadata?: Record<string, unknown>;
  show?: SubWorkflowShow;
  label?: string;
  /**
   * Run the child in another workspace instead of the parent's.
   *
   * Tasks serialize per workspace, so this is how a parent starts work that runs **at the same time** as
   * its own workspace's: a child queued elsewhere takes that workspace's lock, not this one's. The callback
   * still resumes the parent under the parent's own workspace, so ordering there is unchanged.
   *
   * The workspace must already exist. Defaults to the parent's.
   */
  workspaceId?: string;
}

/**
 * Returned by `BaseWorkflow.run()` when queuing a sub-workflow.
 *
 * The parent does NOT wait for the child to finish — `run()` schedules the
 * child and returns immediately. Use the `workflowId` to correlate the
 * eventual callback (the transitions named in `options.onSuccess` and `options.onFailure`),
 * or to query the child's status via the API.
 */
export interface QueueResult {
  /** ID of the queued child workflow run. */
  workflowId: string;
}

/**
 * Shape delivered to a `@Transition({ wait: true })` method on success: a completed sub-workflow's result,
 * or a frontend / API resume.
 *
 * The `schema` option on `@Transition` validates `data` only — the framework constructs the surrounding
 * envelope. `meta` carries whatever the parent passed to `metadata` on `run()` (used by `FanOut`/`Sequence`
 * for per-child correlation, by the LLM tool loop for `toolUseId`, etc.); it is `undefined` for user-driven
 * resumes.
 *
 * @public
 */
export interface TransitionInput<TData = unknown, TMeta = unknown> {
  workflowId: string;
  data: TData;
  meta?: TMeta;
}

/**
 * Shape delivered to the `onFailure` transition when a sub-workflow failed or was canceled.
 *
 * There is no `data`: a child that never reached its result has none, and one that failed after publishing
 * one is still a failure. `schema` on the receiving transition is ignored.
 *
 * @public
 */
export interface FailureInput<TMeta = unknown> {
  workflowId: string;
  status: 'failed' | 'canceled';
  errorMessage: string | null;
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
 * Launch sub-workflows by injecting the workflow class and calling `run()` with an
 * `onSuccess` transition that resumes the parent when the child completes, and an
 * `onFailure` transition for when it does not.
 *
 * @public
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
   * @param options — The transitions that resume the parent when this run ends, and how it is shown
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
   * up incrementally across any transitions; the value is persisted to
   * `WorkflowEntity.result` and returned via the API.
   *
   * Because the result is published at every yield boundary, setting it before a
   * wait transition surfaces an intermediate response that downstream systems can
   * read (via the API / `workflow.updated` events) while the workflow is paused.
   * It is preserved across the resume, so a later run that doesn't touch it keeps
   * the last published value.
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

  /**
   * End this run as failed, with `message` as its error, keeping everything this transition did.
   *
   * A run ends in one of two ways. It completes when it reaches `end`, and it fails when a transition calls
   * this. The state, the result and the documents of the calling transition are committed together with the
   * failure, so the card that says what went wrong survives. The run is over: no transition is offered at the
   * place it stopped at, and a parent receives it through its `onFailure` transition.
   *
   * This is for a step that did its work and then found the run cannot succeed, such as one that released
   * what the run was holding and must now report why. A step that did *not* get its work done throws
   * instead: a thrown error rolls the transition back and leaves the run where it was, with a Retry.
   *
   * It stops the transition at the call, so nothing below it runs.
   */
  protected fail(message: string): never {
    throw new WorkflowFailure(message);
  }
}
