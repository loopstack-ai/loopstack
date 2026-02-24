import { RunContext } from '../dtos';
import { ToolResult } from './handler.interface';

export interface ToolExecutionMetrics {
  durationMs?: number;
  [key: string]: unknown;
}

export interface ToolExecutionContext {
  tool: object;
  args: Record<string, unknown> | undefined;
  runContext: RunContext;
  metrics?: ToolExecutionMetrics;
}

export interface ToolExecutionInterceptor {
  beforeExecute?(context: ToolExecutionContext): Promise<void>;
  afterExecute?(context: ToolExecutionContext, result: ToolResult): Promise<void>;
  onError?(context: ToolExecutionContext, error: unknown): Promise<void>;
}

export const TOOL_EXECUTION_INTERCEPTORS = 'TOOL_EXECUTION_INTERCEPTORS';
