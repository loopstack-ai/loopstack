export type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  metadata?: Record<string, unknown>;
  /** Signals that this tool launched an async sub-workflow. DelegateToolCalls tracks it as pending. */
  pending?: {
    workflowId: string;
  };
};

/** Options passed as the second argument to `BaseTool.call()`. */
export interface ToolCallOptions {
  /** Callback info for async tools — forwarded to sub-workflow `.run()` */
  callback?: {
    transition: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ToolCallEntry {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
}

export type ToolCallsMap = Record<string, ToolCallEntry>;
