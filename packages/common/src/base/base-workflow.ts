import { Inject, Injectable, Type } from '@nestjs/common';
import { z } from 'zod';
import type { DocumentStore } from '../interfaces/document-store.interface.js';
import type { WorkflowOrchestrator } from '../interfaces/workflow-orchestrator.interface.js';
import { DOCUMENT_STORE, WORKFLOW_ORCHESTRATOR } from '../tokens.js';

export interface RunOptions {
  callback?: { transition: string; metadata?: Record<string, unknown> };
}

export interface QueueResult {
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
