import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  InjectTool,
  Input,
  Tool,
  ToolResult,
  ToolSideEffects,
  getBlockArgsSchema,
  getBlockTool,
} from '@loopstack/common';
import { CreateDocument, EventSubscriberService, ToolExecutionService } from '@loopstack/core';
import type { DelegateToolCallsResult, DelegateToolResultEntry } from '../types';

const DelegateToolCallsSchema = z.object({
  message: z.object({
    id: z.string().optional(),
    content: z.array(z.any()),
  }),
  document: z.string().optional(),
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
  config: {
    description: 'Delegate tool calls from an LLM response. Handles both sync tools and async task tools.',
  },
})
export class DelegateToolCalls extends BaseTool {
  private readonly logger = new Logger(DelegateToolCalls.name);

  @InjectTool() private createDocument: CreateDocument;

  constructor(
    private readonly toolExecutionService: ToolExecutionService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {
    super();
  }

  @Input({
    schema: DelegateToolCallsSchema,
  })
  args: DelegateToolCallsArgs;

  async run(args: DelegateToolCallsArgs): Promise<ToolResult<DelegateToolCallsResult>> {
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

    // 1. Execute ALL tools in parallel
    const results = await Promise.all(toolUseBlocks.map((block) => this.executeTool(block)));

    // 2. Register subscribers for async results + build toolResults array
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
        // Validate callback is provided
        if (!args.callback?.transition) {
          throw new Error(
            `Tool "${block.name}" returned an async result but no callback.transition was provided. ` +
              `Add a callback configuration to the delegateToolCalls args.`,
          );
        }

        // Register event subscriber
        await this.eventSubscriberService.registerSubscriber(
          this.context.parentWorkflowId,
          this.context.workflowId!,
          args.callback.transition,
          resultData.correlationId as string,
          resultData.eventName as string,
          this.context.userId,
          this.context.workspaceId,
          { toolUseId: block.id, toolName: block.name },
        );

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
    const effects: ToolSideEffects[] = [];
    if (args.document && !args.skipResponseMessage) {
      const docResult = await this.createResponseDocument(args, toolResults);
      if (docResult.effects) {
        effects.push(...docResult.effects);
      }
    }
    effects.push(...toolEffects);

    return {
      data: {
        allCompleted: pendingCount === 0,
        toolResults,
        message: args.message as DelegateToolCallsResult['message'],
        pendingCount,
      },
      effects,
    };
  }

  private async executeTool(block: Anthropic.ToolUseBlock): Promise<ToolResult> {
    try {
      const tool = getBlockTool<BaseTool>(this.parent, block.name);
      if (!tool) {
        throw new Error(`Tool with name ${block.name} not found.`);
      }

      const schema = getBlockArgsSchema(tool);
      const parsedArgs = schema
        ? (schema.parse(block.input) as Record<string, unknown>)
        : (block.input as Record<string, unknown>);

      return await this.toolExecutionService.execute(tool, parsedArgs);
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
    args: DelegateToolCallsArgs,
    toolResults: DelegateToolResultEntry[],
  ): Promise<ToolResult> {
    return this.createDocument.run({
      id: args.message.id,
      document: args.document!,
      validate: 'skip' as const,
      update: {
        content: {
          role: 'assistant',
          content: args.message.content,
          toolResults,
        },
      },
    });
  }
}
