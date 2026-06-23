import type { BaseTool } from '../base/base-tool.js';
import type { ToolCallOptions, ToolEnvelope } from './handler.interface.js';

/**
 * Interface for the tool execution pipeline.
 *
 * Defined in common so BaseTool can reference it via injection token.
 * Implemented by ToolPipelineService in core.
 */
export interface ToolPipeline {
  execute<TArgs extends object, TConfig extends object, TResult, TMeta = Record<string, unknown>>(
    tool: BaseTool<TArgs, TConfig, TResult, TMeta>,
    args: TArgs | undefined,
    options?: ToolCallOptions<TConfig>,
  ): Promise<ToolEnvelope<TResult, TMeta>>;
}
