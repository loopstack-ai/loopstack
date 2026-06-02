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
 * - All transitions receive `(state, ctx)` and return `Promise<TState>`
 * - Wait transitions receive `(state, payload, ctx)` and return `Promise<TState>`
 * - `ctx` is optional (trailing param can be omitted)
 * - Args are available via `ctx.input.args`
 * - Use `from: 'start'` (or omit `from`) for initial, `to: 'end'` for final
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
