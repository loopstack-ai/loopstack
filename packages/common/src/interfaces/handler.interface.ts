/**
 * Raw envelope returned by `BaseTool.handle()` and `ToolPipeline.execute()`.
 *
 * Models all three legitimate tool outcomes:
 * - success: `data` (+ optional `metadata`, `type`)
 * - recoverable failure: `error` (read by the LLM agent tool-call loop and packaged as `is_error: true`)
 * - async pending: `pending` (the tool launched a sub-workflow; result arrives via callback)
 *
 * Workflow authors do NOT see this shape — they go through `BaseTool.call()` which returns the
 * narrowed `ToolResult` and throws on `error` / `pending`.
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
};

/**
 * Narrowed success-path return of `BaseTool.call()`.
 *
 * `data` and `metadata` are non-optional — `call()` throws when the underlying envelope carries
 * `error` or `pending`, so workflow authors never observe those states from this API.
 */
export interface ToolResult<TData = unknown, TMeta = Record<string, unknown>> {
  data: TData;
  metadata: TMeta;
  type?: 'text' | 'image' | 'file';
}

/** Options passed as the second argument to `BaseTool.call()`. */
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
