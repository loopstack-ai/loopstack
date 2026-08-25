import { z } from 'zod';

/**
 * A document a tool declares as part of its result envelope instead of writing it
 * inside `handle()`. The tool pipeline applies declarations through the document
 * store after the interceptor chain, so declared documents appear identically for
 * live and replayed tool calls.
 *
 * `documentName` is the document's registered name (the `@Document({ name })` option,
 * or the kebab-case derivation of the class name). `options` mirror `DocumentSaveOptions`.
 *
 * @public
 */
export interface ToolDocumentDeclaration {
  documentName: string;
  content: Record<string, unknown>;
  options?: {
    key?: string;
    meta?: Record<string, unknown>;
    validate?: 'strict' | 'safe' | 'skip';
  };
}

export const ToolDocumentDeclarationSchema = z.object({
  documentName: z.string().min(1),
  content: z.record(z.string(), z.unknown()),
  options: z
    .object({
      key: z.string().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
      validate: z.enum(['strict', 'safe', 'skip']).optional(),
    })
    .optional(),
});

/**
 * Raw envelope returned by `BaseTool.handle()` and `ToolPipeline.execute()`.
 *
 * Models all three legitimate tool outcomes:
 * - success: `data` (+ optional `metadata`, `type`)
 * - recoverable failure: `error` (read by the LLM agent tool-call loop and packaged as `is_error: true`)
 * - async pending: `pending` (the tool launched a sub-workflow; result arrives via callback)
 *
 * Tool authors return this shape from `handle()`. Consumers go through `BaseTool.call()`, which
 * returns the narrowed `ToolResult` and throws on `error` / `pending`.
 *
 * @public
 */
export type ToolEnvelope<TData = unknown, TMeta = Record<string, unknown>> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  metadata?: TMeta;
  /** Signals that this tool launched an async sub-workflow. DelegateToolCalls tracks it as pending. */
  pending?: {
    workflowId: string;
  };
  /**
   * Documents this tool produces. Applied by the tool pipeline via the document store
   * after the interceptor chain (success envelopes only) — under replay, declarations
   * from recorded envelopes are applied the same way. Not visible on `ToolResult`.
   */
  documents?: ToolDocumentDeclaration[];
};

/**
 * Narrowed success-path return of `BaseTool.call()`.
 *
 * `data` and `metadata` are non-optional — `call()` throws when the underlying envelope carries
 * `error` or `pending`, so workflow authors never observe those states from this API.
 *
 * @public
 */
export interface ToolResult<TData = unknown, TMeta = Record<string, unknown>> {
  data: TData;
  metadata: TMeta;
  type?: 'text' | 'image' | 'file';
}

/**
 * Options passed as the second argument to `BaseTool.call()`.
 *
 * @public
 */
export interface ToolCallOptions<TConfig = object> {
  /** Callback info for async tools — forwarded to sub-workflow `.run()` */
  callback?: {
    transition: string;
    metadata?: Record<string, unknown>;
  };
  /** Author-provided config. Validated against `configSchema`. */
  config?: TConfig;
}

export interface ToolCallEntry {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
}

export type ToolCallsMap = Record<string, ToolCallEntry>;
