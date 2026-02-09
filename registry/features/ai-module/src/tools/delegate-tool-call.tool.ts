import { Injectable } from '@nestjs/common';
import { ToolUIPart, UIMessage } from 'ai';
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
});

type DelegateToolCallsToolArgs = z.infer<typeof DelegateToolCallsToolSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Delegate a tool call.',
  },
})
export class DelegateToolCall implements ToolInterface<DelegateToolCallsToolArgs> {
  @Input({
    schema: DelegateToolCallsToolSchema,
  })
  args: DelegateToolCallsToolArgs;

  async execute(
    args: DelegateToolCallsToolArgs,
    ctx: RunContext,
    parent: WorkflowInterface,
    runtime: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const parts = args.message.parts;
    const resultParts: ToolUIPart[] = [];

    for (const part of parts) {
      if (!part.type.startsWith('tool-')) {
        continue;
      }

      if (!part.toolCallId) {
        throw new Error(`No toolCallId provided`);
      }

      const toolName = part.type.replace(/^tool-/, '');

      const tool = getBlockTool<ToolInterface>(parent, toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found.`);
      }
      const result: ToolResult = await tool.execute(part.input as Record<string, unknown>, ctx, parent, runtime);

      resultParts.push({
        type: part.type as ToolUIPart['type'],
        toolCallId: part.toolCallId,
        output: {
          type: result.type || 'text',
          value: result.data as unknown,
        },
        input: part.input as Record<string, unknown>,
        state: 'output-available',
      } satisfies ToolUIPart);
    }

    const resultMessage: UIMessage = {
      id: args.message.id,
      role: 'assistant',
      parts: resultParts,
    };

    return {
      data: resultMessage,
    };
  }
}
