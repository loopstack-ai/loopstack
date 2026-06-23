import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOOL_PIPELINE, TOOL_REGISTRY, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { ToolPipeline, ToolRegistry } from '@loopstack/common';
import type { LlmDelegateResult, LlmToolCall, LlmToolErrorEntry, LlmToolResultEntry } from '../types/index.js';

/**
 * Shared tool execution logic for LLM tool calling.
 *
 * Resolves tool names from LLM responses via ToolRegistry.
 * Provider-agnostic — no LLM-specific logic, just framework tool dispatch.
 */
@Injectable()
export class LlmDelegateService {
  private readonly logger = new Logger(LlmDelegateService.name);

  constructor(
    @Inject(TOOL_REGISTRY) private readonly toolRegistry: ToolRegistry,
    @Inject(TOOL_PIPELINE) private readonly pipeline: ToolPipeline,
  ) {}

  /**
   * Execute tool calls from an LLM response.
   * Resolves tool names to instances via ToolRegistry.
   */
  async delegateToolCalls(toolCalls: LlmToolCall[], callback: { transition: string }): Promise<LlmDelegateResult> {
    if (toolCalls.length === 0) {
      return { allCompleted: true, toolResults: [], pendingCount: 0, errorCount: 0, hasErrors: false, errors: [] };
    }

    const results = await Promise.all(
      toolCalls.map((toolCall) =>
        this.executeTool(toolCall, {
          callback: { transition: callback.transition, metadata: { toolUseId: toolCall.id, toolName: toolCall.name } },
        }),
      ),
    );

    let pendingCount = 0;
    const toolResults: LlmToolResultEntry[] = [];
    const errors: LlmToolErrorEntry[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const tc = toolCalls[i];
      const result = results[i];

      if (result.pending) {
        pendingCount++;
      } else {
        const isError = !!result.error;
        toolResults.push({
          type: 'tool_result',
          toolCallId: tc.id,
          content: result.data ? JSON.stringify(result.data, null, 2) : '',
          isError,
        });
        if (isError) {
          errors.push({ toolName: tc.name, toolCallId: tc.id, message: result.error! });
        }
      }
    }

    return {
      allCompleted: pendingCount === 0,
      toolResults,
      pendingCount,
      errorCount: errors.length,
      hasErrors: errors.length > 0,
      errors,
    };
  }

  /**
   * Handle async tool completion callback and update the delegate result.
   */
  async updateToolResult(delegateResult: LlmDelegateResult, completedTool: unknown): Promise<LlmDelegateResult> {
    const completedToolRecord = completedTool as Record<string, unknown>;

    const subscriberMetadata = completedToolRecord.meta as { toolUseId: string; toolName: string } | undefined;
    if (!subscriberMetadata?.toolUseId || !subscriberMetadata?.toolName) {
      throw new Error(
        'Callback payload is missing TransitionInput.meta with toolUseId and toolName. ' +
          'Ensure the event subscriber was registered with metadata by delegateToolCalls.',
      );
    }

    const { toolUseId, toolName } = subscriberMetadata;

    const toolResult = await this.handleToolCompletion(toolName, completedToolRecord);

    const isError = !!toolResult.error;
    const completedEntry: LlmToolResultEntry = {
      type: 'tool_result',
      toolCallId: toolUseId,
      content: toolResult.data ? JSON.stringify(toolResult.data, null, 2) : '',
      isError,
    };
    const updatedResults = [...delegateResult.toolResults, completedEntry];

    const pendingCount = delegateResult.pendingCount - 1;
    const allCompleted = pendingCount === 0;

    const previousErrors = delegateResult.errors;
    const errors = isError
      ? [...previousErrors, { toolName, toolCallId: toolUseId, message: toolResult.error! }]
      : previousErrors;

    return {
      ...delegateResult,
      toolResults: updatedResults,
      allCompleted,
      pendingCount,
      errorCount: errors.length,
      hasErrors: errors.length > 0,
      errors,
    };
  }

  /**
   * Execute a single tool call by resolving the tool from the registry.
   */
  private async executeTool(toolCall: LlmToolCall, options?: ToolCallOptions): Promise<ToolEnvelope> {
    try {
      const tool = this.toolRegistry.get(toolCall.name);
      return await this.pipeline.execute(tool, toolCall.args as Record<string, unknown>, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${toolCall.name}" failed: ${errorMessage}`);
      return { data: errorMessage, error: errorMessage };
    }
  }

  /**
   * Handle async tool completion — resolve tool from registry and call complete().
   */
  private async handleToolCompletion(
    toolName: string,
    completedToolRecord: Record<string, unknown>,
  ): Promise<ToolEnvelope> {
    const tool = this.toolRegistry.get(toolName);

    const callbackStatus = completedToolRecord.status as string | undefined;
    const subWorkflowFailed = callbackStatus === 'failed' || callbackStatus === 'canceled';

    let toolResult: ToolEnvelope;
    try {
      toolResult = await tool.complete(completedToolRecord);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${toolName}" complete() failed: ${errorMessage}`);
      toolResult = { data: errorMessage, error: errorMessage };
    }

    if (subWorkflowFailed && !toolResult.error) {
      const errorMessage = `Sub-workflow "${toolName}" ${callbackStatus}.`;
      this.logger.error(errorMessage);
      toolResult = {
        data: (toolResult.data as string) ?? errorMessage,
        error: errorMessage,
      };
    }

    return toolResult;
  }
}
