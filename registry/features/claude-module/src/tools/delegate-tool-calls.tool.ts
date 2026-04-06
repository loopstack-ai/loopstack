import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  DocumentClass,
  Tool,
  ToolResult,
  ToolSideEffects,
  getBlockTool,
  getBlockTypeFromMetadata,
} from '@loopstack/common';
import type { DelegateToolCallsResult, DelegateToolResultEntry } from '../types';

const DelegateToolCallsSchema = z.object({
  message: z.object({
    id: z.string().optional(),
    content: z.array(z.any()),
  }),
  document: z
    .custom<DocumentClass>((val) => typeof val === 'function' && getBlockTypeFromMetadata(val as object) === 'document')
    .optional(),
  skipResponseMessage: z.boolean().optional(),
  callback: z
    .object({
      transition: z.string(),
    })
    .optional(),
});

type DelegateToolCallsArgs = z.infer<typeof DelegateToolCallsSchema>;

@Injectable()
@Tool({
  uiConfig: {
    description: 'Delegate tool calls from an LLM response. Handles both sync tools and async task tools.',
  },
  schema: DelegateToolCallsSchema,
})
export class DelegateToolCalls extends BaseTool {
  private readonly logger = new Logger(DelegateToolCalls.name);

  async call(args: DelegateToolCallsArgs): Promise<ToolResult<DelegateToolCallsResult>> {
    const contentBlocks = args.message.content as Anthropic.ContentBlock[];
    const toolUseBlocks = contentBlocks.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      return {
        data: {
          allCompleted: true,
          toolResults: [],
          message: args.message as DelegateToolCallsResult['message'],
          pendingCount: 0,
        },
      };
    }

    // 1. Execute ALL tools in parallel, passing callback with per-tool metadata
    const results = await Promise.all(
      toolUseBlocks.map((block) =>
        this.executeTool(
          block,
          args.callback
            ? {
                transition: args.callback.transition,
                metadata: { toolUseId: block.id, toolName: block.name },
              }
            : undefined,
        ),
      ),
    );

    // 2. Build toolResults array — async tools are handled by the orchestrator's
    //    complete() → callback() flow via callbackTransition on the child workflow entity
    let pendingCount = 0;
    const toolResults: DelegateToolResultEntry[] = [];
    const toolEffects: ToolSideEffects[] = [];

    for (let i = 0; i < toolUseBlocks.length; i++) {
      const block = toolUseBlocks[i];
      const result = results[i];

      // Collect effects from tool execution (e.g. link documents)
      if (result.effects) {
        toolEffects.push(...result.effects);
      }

      const resultData = result.data as Record<string, unknown> | undefined;
      if (resultData?.mode === 'async') {
        // Async tools now use the orchestrator lifecycle: the tool's internal sub-workflow
        // stores callbackTransition, and complete() triggers the parent callback automatically.
        pendingCount++;
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.data ? JSON.stringify(result.data, null, 2) : '',
          is_error: !!result.error,
        });
      }
    }

    // 3. Create response document first (tool call message), then append
    //    tool execution effects (e.g. link documents) so they appear after.
    if (args.document && !args.skipResponseMessage) {
      await this.createResponseDocument(args.document, args, toolResults);
    }

    return {
      data: {
        allCompleted: pendingCount === 0,
        toolResults,
        message: args.message as DelegateToolCallsResult['message'],
        pendingCount,
      },
      effects: toolEffects.length > 0 ? toolEffects : undefined,
    };
  }

  private async executeTool(
    block: Anthropic.ToolUseBlock,
    callback?: { transition: string; metadata?: Record<string, unknown> },
  ): Promise<ToolResult> {
    try {
      const tool = getBlockTool<BaseTool>(this.ctx.parent, block.name);
      if (!tool) {
        throw new Error(`Tool with name ${block.name} not found.`);
      }

      const input = { ...(block.input as Record<string, unknown>), ...(callback ? { callback } : {}) };
      return await tool.call(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${block.name}" failed: ${errorMessage}`);
      return {
        data: errorMessage,
        error: errorMessage,
      };
    }
  }

  private async createResponseDocument(
    document: DocumentClass,
    args: DelegateToolCallsArgs,
    toolResults: DelegateToolResultEntry[],
  ): Promise<void> {
    await this.repository.save(
      document,
      {
        role: 'assistant',
        content: args.message.content,
        toolResults,
      },
      { id: args.message.id, validate: 'skip' },
    );
  }
}
