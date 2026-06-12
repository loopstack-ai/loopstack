import { Inject, Injectable, Type } from '@nestjs/common';
import { z } from 'zod';
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

/** Base Zod schema for sub-workflow callback payloads. Extend with `.extend({ data: ... })` to type the result. */
export const CallbackSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  data: z.unknown(),
});

/**
 * Abstract base class for workflows.
 *
 * Generic parameters:
 * - `TArgs` — per-invocation input, validated against `@Workflow({ schema })`
 * - `TState` — explicit state object passed into and returned from transitions
 *
 * Workflows are singletons. State flows explicitly through parameters:
 * - All transitions receive `(state, ctx)` and return `Promise<TState>`
 * - Wait transitions receive `(state, payload, ctx)` and return `Promise<TState>`
 * - `ctx` is optional (trailing param can be omitted)
 * - Args are available via `ctx.args`
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
export abstract class BaseWorkflow<TArgs = Record<string, unknown>, _TState = Record<string, unknown>> {
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
