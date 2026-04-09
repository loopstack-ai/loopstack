import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  DocumentClass,
  Tool,
  ToolCallOptions,
  ToolResult,
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

    // 1. Execute ALL tools in parallel, passing callback via options (not args)
    const results = await Promise.all(
      toolUseBlocks.map((block) => {
        const toolCallback = args.callback
          ? {
              transition: args.callback.transition,
              metadata: { toolUseId: block.id, toolName: block.name },
            }
          : undefined;
        return this.executeTool(block, toolCallback ? { callback: toolCallback } : undefined);
      }),
    );

    // 2. Build toolResults array — async tools signal via result.pending
    let pendingCount = 0;
    const toolResults: DelegateToolResultEntry[] = [];

    for (let i = 0; i < toolUseBlocks.length; i++) {
      const block = toolUseBlocks[i];
      const result = results[i];

      if (result.pending) {
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

    // 3. Create response document (tool call message)
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
    };
  }

  private async executeTool(block: Anthropic.ToolUseBlock, options?: ToolCallOptions): Promise<ToolResult> {
    try {
      const tool = getBlockTool<BaseTool>(this.ctx.parent, block.name);
      if (!tool) {
        throw new Error(`Tool with name ${block.name} not found.`);
      }

      return await tool.call(block.input as Record<string, unknown>, options);
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
