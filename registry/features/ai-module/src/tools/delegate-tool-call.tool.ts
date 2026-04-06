import { Logger } from '@nestjs/common';
import { ToolUIPart, UIMessage } from 'ai';
import { z } from 'zod';
import {
  BaseTool,
  Tool,
  ToolCallEntry,
  ToolCallsMap,
  ToolInterface,
  ToolResult,
  getBlockTool,
} from '@loopstack/common';

const DelegateToolCallsToolSchema = z.object({
  message: z.object({
    id: z.string(),
    parts: z.array(
      z.object({
        type: z.string(),
        input: z.any().optional(),
        toolCallId: z.string().optional(),
      }),
    ),
  }),
  document: z.string().optional(),
  skipResponseMessage: z.boolean().optional(),
});

type DelegateToolCallsToolArgs = z.infer<typeof DelegateToolCallsToolSchema>;

@Tool({
  uiConfig: {
    description: 'Delegate a tool call.',
  },
  schema: DelegateToolCallsToolSchema,
})
export class DelegateToolCall extends BaseTool {
  private readonly logger = new Logger(DelegateToolCall.name);

  async call(args: DelegateToolCallsToolArgs): Promise<ToolResult> {
    const parts = args.message.parts;
    const resultParts: ToolUIPart[] = [];
    const toolCalls: ToolCallsMap = {};

    for (const part of parts) {
      if (!part.type.startsWith('tool-')) {
        continue;
      }

      if (!part.toolCallId) {
        throw new Error(`No toolCallId provided`);
      }

      const toolName = part.type.replace(/^tool-/, '');

      const tool = getBlockTool<ToolInterface>(this.ctx.parent, toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found.`);
      }

      try {
        const result: ToolResult = await (tool as BaseTool).call(part.input as Record<string, unknown>);

        resultParts.push({
          type: part.type as ToolUIPart['type'],
          toolCallId: part.toolCallId,
          output: {
            type: 'text',
            value: JSON.stringify(result.data, null, 2),
          },
          input: part.input as Record<string, unknown>,
          state: 'output-available',
        } satisfies ToolUIPart);

        toolCalls[toolName] = {
          id: part.toolCallId,
          name: toolName,
          input: part.input,
          output: result.data,
        } satisfies ToolCallEntry;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool "${toolName}" failed: ${errorMessage}`);

        resultParts.push({
          type: part.type as ToolUIPart['type'],
          toolCallId: part.toolCallId,
          input: part.input as Record<string, unknown>,
          state: 'output-error',
          errorText: errorMessage,
        } as ToolUIPart);

        toolCalls[toolName] = {
          id: part.toolCallId,
          name: toolName,
          input: part.input,
        } satisfies ToolCallEntry;
      }
    }

    const resultMessage: UIMessage & { toolCalls?: ToolCallsMap } = {
      id: args.message.id,
      role: 'assistant',
      parts: resultParts,
      ...(Object.keys(toolCalls).length > 0 ? { toolCalls } : {}),
    };

    if (args.document && !args.skipResponseMessage) {
      const docResult = await this.createResponseMessage(args, resultMessage);

      return {
        data: resultMessage,
        effects: docResult.effects,
      };
    }

    return {
      data: resultMessage,
    };
  }

  private async createResponseMessage(args: DelegateToolCallsToolArgs, resultMessage: UIMessage): Promise<ToolResult> {
    const createDocumentTool = getBlockTool<ToolInterface>(this.ctx.parent, 'createDocument');
    if (!createDocumentTool) {
      throw new Error('createDocument tool not found in parent context.');
    }

    return (createDocumentTool as BaseTool).call({
      id: args.message.id,
      document: args.document,
      update: { content: resultMessage },
    });
  }
}
