import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolCallEntry,
  ToolCallsMap,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockTool,
} from '@loopstack/common';
import { StateMachineToolCallProcessorService } from '@loopstack/core';

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

  constructor(private readonly toolCallProcessor: StateMachineToolCallProcessorService) {}

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
    const toolCalls: ToolCallsMap = {};
    let effects: ToolSideEffects[] = [];

    for (const block of contentBlocks) {
      if (block.type !== 'tool_use') {
        continue;
      }

      const tool = this.toolCallProcessor.getTool(parent, block.name);

      try {
        const parsedArgs = this.toolCallProcessor.parseArgs(
          tool,
          block.input as Record<string, unknown> | undefined,
          runtime.transition!,
        );

        const result = await this.toolCallProcessor.executeToolCall(tool, parsedArgs, ctx, parent, runtime);

        if (result?.effects) {
          effects.push(...result.effects);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result?.data ? JSON.stringify(result.data, null, 2) : '',
        });

        toolCalls[block.name] = {
          id: block.id,
          name: block.name,
          input: block.input,
          output: result?.data,
        } satisfies ToolCallEntry;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool "${block.name}" failed: ${errorMessage}`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: errorMessage,
          is_error: true,
        });

        toolCalls[block.name] = {
          id: block.id,
          name: block.name,
          input: block.input,
        } satisfies ToolCallEntry;
      }
    }

    const resultData = {
      message: args.message,
      toolResults,
      ...(Object.keys(toolCalls).length > 0 ? { toolCalls } : {}),
    };

    if (args.document && !args.skipResponseMessage) {
      const docResult = await this.createResponseMessage(args, toolResults, ctx, parent, runtime);
      if (docResult.effects) {
        effects = [...docResult.effects, ...effects];
      }
    }

    return {
      data: resultData,
      effects,
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
