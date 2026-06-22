import { Inject, Injectable, Type } from '@nestjs/common';
import type { DocumentStore } from '../interfaces/document-store.interface.js';
import type { WorkflowOrchestrator } from '../interfaces/workflow-orchestrator.interface.js';
import { DOCUMENT_STORE, TEMPLATE_RENDERER, WORKFLOW_ORCHESTRATOR } from '../tokens.js';
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
 * Generic parameter:
 * - `TArgs` — per-invocation input, validated against `@Workflow({ schema })`.
 *   Used to type `run()` at sub-workflow call sites and `ctx.args` inside transitions
 *   (via `ctx: RunContext<TArgs>`). State is typed per-transition on the `state` parameter.
 *
 * Workflows are singletons. State flows explicitly through parameters:
 * - All transitions receive `(state, ctx)` and return `Promise<State>`
 * - Wait transitions receive `(state, payload, ctx)` and return `Promise<State>`
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
export abstract class BaseWorkflow<TArgs = Record<string, unknown>> {
  /** @internal — injected by the framework. Routes run() through the orchestrator. */
  @Inject(WORKFLOW_ORCHESTRATOR) private readonly __orchestrator!: WorkflowOrchestrator;

  /** Document store for saving and retrieving workflow documents. */
  @Inject(DOCUMENT_STORE) protected readonly documentStore!: DocumentStore;

  /** Render a Handlebars template file with optional data context. */
  @Inject(TEMPLATE_RENDERER) protected readonly render!: TemplateRenderFn;

  /**
   * Launch this workflow as a sub-workflow.
   *
   * @param args — Input args, validated against `@Workflow({ schema })`
   * @param options — Optional callback to resume the parent workflow when this one completes
   */
  async run(args?: TArgs, options?: RunOptions): Promise<QueueResult> {
    return this.__orchestrator.queue(this.constructor as Type, args as Record<string, unknown>, options);
  }
}
