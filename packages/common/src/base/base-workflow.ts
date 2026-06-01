import { Injectable } from '@nestjs/common';
import { z } from 'zod';

export interface RunOptions {
  workflowName?: string;
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
 * - `@Initial` methods receive `(ctx, args, state)` and return `Promise<TState>`
 * - `@Transition` methods receive `(ctx, state)` or `(ctx, state, payload)` and return `Promise<TState>`
 * - `@Final` methods receive `(ctx, state)` and return `Promise<unknown>` (the workflow result)
 *
 * Services are injected via constructor on the concrete class:
 * ```ts
 * constructor(
 *   private llm: LlmGenerateTextTool,
 *   private documentStore: DocumentStore,
 * ) { super(); }
 * ```
 */
@Injectable()
export abstract class BaseWorkflow<TArgs = Record<string, unknown>, TState = Record<string, unknown>> {}
