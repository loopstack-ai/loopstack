import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockTool,
} from '@loopstack/common';

const ClaudeDelegateToolCallSchema = z.object({
  message: z.object({
    id: z.string().optional(),
    content: z.array(z.any()),
  }),
  document: z.string().optional(),
  skipResponseMessage: z.boolean().optional(),
});

type ClaudeDelegateToolCallArgs = z.infer<typeof ClaudeDelegateToolCallSchema>;

@Tool({
  config: {
    description: 'Delegate tool calls from a Claude response.',
  },
})
export class ClaudeDelegateToolCall implements ToolInterface<ClaudeDelegateToolCallArgs> {
  private readonly logger = new Logger(ClaudeDelegateToolCall.name);

  @Input({
    schema: ClaudeDelegateToolCallSchema,
  })
  args: ClaudeDelegateToolCallArgs;

  async execute(
    args: ClaudeDelegateToolCallArgs,
    ctx: RunContext,
    parent: WorkflowInterface,
    runtime: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const contentBlocks = args.message.content as Anthropic.ContentBlock[];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of contentBlocks) {
      if (block.type !== 'tool_use') {
        continue;
      }

      const tool = getBlockTool<ToolInterface>(parent, block.name);

      if (!tool) {
        throw new Error(`Tool ${block.name} not found.`);
      }

      try {
        const result: ToolResult = await tool.execute(block.input as Record<string, unknown>, ctx, parent, runtime);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result.data, null, 2),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool "${block.name}" failed: ${errorMessage}`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: errorMessage,
          is_error: true,
        });
      }
    }

    const resultData = { toolResults };

    if (args.document && !args.skipResponseMessage) {
      const docResult = await this.createResponseMessage(args, toolResults, ctx, parent, runtime);

      return {
        data: resultData,
        effects: docResult.effects,
      };
    }

    return {
      data: resultData,
    };
  }

  private async createResponseMessage(
    args: ClaudeDelegateToolCallArgs,
    toolResults: Anthropic.ToolResultBlockParam[],
    ctx: RunContext,
    parent: WorkflowInterface,
    runtime: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const createDocumentTool = getBlockTool<ToolInterface>(parent, 'createDocument');
    if (!createDocumentTool) {
      throw new Error('createDocument tool not found in parent context.');
    }

    return createDocumentTool.execute(
      {
        id: args.message.id,
        document: args.document,
        update: {
          content: {
            role: 'assistant',
            content: args.message.content,
            toolResults,
          },
        },
      },
      ctx,
      parent,
      runtime,
    );
  }
}
