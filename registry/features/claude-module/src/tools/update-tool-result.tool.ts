import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectTool, Input, Tool, ToolResult, ToolSideEffects, getBlockTool } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';

const UpdateToolResultSchema = z.object({
  delegateResult: z.object({
    allCompleted: z.boolean(),
    toolResults: z.array(z.any()),
    message: z.any(),
    pendingCount: z.number(),
  }),
  completedTool: z.any(),
  document: z.string().optional(),
});

type UpdateToolResultArgs = z.infer<typeof UpdateToolResultSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Handle async tool completion callback. Updates the response document and tracks completion state.',
  },
})
export class UpdateToolResult extends BaseTool {
  private readonly logger = new Logger(UpdateToolResult.name);

  @InjectTool() private createDocument: CreateDocument;

  @Input({
    schema: UpdateToolResultSchema,
  })
  args: UpdateToolResultArgs;

  async run(args: UpdateToolResultArgs): Promise<ToolResult> {
    const { delegateResult } = args;
    const completedToolRecord = args.completedTool as Record<string, unknown>;

    // 1. Extract tool identity from subscriber metadata
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

    // 2. Resolve tool and call complete() if it exists
    const tool = getBlockTool<BaseTool>(this.parent, toolName);
    if (!tool) {
      throw new Error(`Tool with name ${toolName} not found.`);
    }
    let toolResult: ToolResult;
    try {
      if ('complete' in tool && typeof tool.complete === 'function') {
        toolResult = await (tool as BaseTool & { complete: (result: unknown) => Promise<ToolResult> }).complete(
          completedToolRecord,
        );
      } else {
        toolResult = { data: completedToolRecord.result ?? completedToolRecord };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${toolName}" complete() failed: ${errorMessage}`);
      toolResult = {
        data: errorMessage,
        error: errorMessage,
      };
    }

    // 3. Merge into toolResults (append completed result)
    const completedEntry = {
      type: 'tool_result' as const,
      tool_use_id: toolUseId,
      content: toolResult.data ? JSON.stringify(toolResult.data, null, 2) : '',
      is_error: !!toolResult.error,
    };
    const updatedResults = [...(delegateResult.toolResults as Record<string, unknown>[]), completedEntry];

    // 4. Update completion state
    const pendingCount = delegateResult.pendingCount - 1;
    const allCompleted = pendingCount === 0;

    // 5. Create updated response document (invalidates previous)
    const allEffects: ToolSideEffects[] = [];
    if (toolResult.effects) {
      allEffects.push(...toolResult.effects);
    }

    if (args.document) {
      const docResult = await this.createDocument.run({
        id: (delegateResult.message as Record<string, unknown>).id as string,
        document: args.document,
        validate: 'skip' as const,
        update: {
          content: {
            role: 'assistant',
            content: (delegateResult.message as Record<string, unknown>).content,
            toolResults: updatedResults,
          },
        },
      });
      if (docResult.effects) {
        allEffects.push(...docResult.effects);
      }
    }

    return {
      data: {
        ...delegateResult,
        toolResults: updatedResults,
        allCompleted,
        pendingCount,
      },
      effects: allEffects.length > 0 ? allEffects : undefined,
    };
  }
}
