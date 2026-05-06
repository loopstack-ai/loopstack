import { Injectable, Logger } from '@nestjs/common';
import { BaseTool, ToolCallOptions, ToolResult, WorkflowInterface, resolveBlockTool } from '@loopstack/common';
import type { LlmDelegateResult, LlmToolCall, LlmToolErrorEntry, LlmToolResultEntry } from '../types';

/**
 * Shared tool execution logic for LLM tool calling.
 *
 * Resolves tools from the parent workflow and workspace, executes them,
 * and handles async completion callbacks. Provider-agnostic — no LLM-specific
 * logic, just framework tool dispatch.
 */
@Injectable()
export class LlmDelegateService {
  private readonly logger = new Logger(LlmDelegateService.name);

  /**
   * Execute tool calls from an LLM response.
   * Resolves each tool from workflow/workspace and executes in parallel.
   */
  async delegateToolCalls(
    toolCalls: LlmToolCall[],
    parent: WorkflowInterface,
    workspace?: object,
    callback?: { transition: string },
  ): Promise<LlmDelegateResult> {
    if (toolCalls.length === 0) {
      return { allCompleted: true, toolResults: [], pendingCount: 0, errorCount: 0, hasErrors: false, errors: [] };
    }

    const results = await Promise.all(
      toolCalls.map((toolCall) => {
        const toolCallback = callback
          ? { transition: callback.transition, metadata: { toolUseId: toolCall.id, toolName: toolCall.name } }
          : undefined;
        return this.executeTool(toolCall, parent, workspace, toolCallback ? { callback: toolCallback } : undefined);
      }),
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
  async updateToolResult(
    delegateResult: LlmDelegateResult,
    completedTool: unknown,
    parent: WorkflowInterface,
    workspace?: object,
  ): Promise<LlmDelegateResult> {
    const completedToolRecord = completedTool as Record<string, unknown>;

    const subscriberMetadata = completedToolRecord._subscriberMetadata as
      | { toolUseId: string; toolName: string }
      | undefined;
    if (!subscriberMetadata?.toolUseId || !subscriberMetadata?.toolName) {
      throw new Error(
        'Callback payload is missing _subscriberMetadata with toolUseId and toolName. ' +
          'Ensure the event subscriber was registered with metadata by delegateToolCalls.',
      );
    }

    const { toolUseId, toolName } = subscriberMetadata;

    const toolResult = await this.handleToolCompletion(toolName, completedToolRecord, parent, workspace);

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
   * Resolve a tool by name from workflow/workspace and execute it.
   */
  async executeTool(
    toolCall: LlmToolCall,
    parent: WorkflowInterface,
    workspace?: object,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    try {
      const tool = resolveBlockTool<BaseTool>(parent, toolCall.name, workspace);
      if (!tool) {
        throw new Error(`Tool with name ${toolCall.name} not found.`);
      }

      return await tool.call(toolCall.args, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${toolCall.name}" failed: ${errorMessage}`);
      return { data: errorMessage, error: errorMessage };
    }
  }

  /**
   * Handle async tool completion — resolve tool and call complete().
   */
  async handleToolCompletion(
    toolName: string,
    completedToolRecord: Record<string, unknown>,
    parent: WorkflowInterface,
    workspace?: object,
  ): Promise<ToolResult> {
    const tool = resolveBlockTool<BaseTool>(parent, toolName, workspace);
    if (!tool) {
      throw new Error(`Tool with name ${toolName} not found.`);
    }

    const callbackStatus = completedToolRecord.status as string | undefined;
    const subWorkflowFailed = callbackStatus === 'failed' || callbackStatus === 'canceled';

    let toolResult: ToolResult;
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
