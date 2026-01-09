import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { ToolBase, WorkflowBase } from '@loopstack/core';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';
import { ToolUIPart, UIMessage } from 'ai';

const DelegateToolCallsToolSchema = z.object({
  message: z.object({
    id: z.string(),
    parts: z.array(
      z.object({
        type: z.string(),
        input: z.any(),
        toolCallId: z.string(),
      }),
    ),
  }),
});

type DelegateToolCallsToolArgs = z.infer<typeof DelegateToolCallsToolSchema>;

@BlockConfig({
  config: {
    description: 'Delegate a tool call.',
  },
})
@WithArguments(DelegateToolCallsToolSchema)
export class DelegateToolCall extends ToolBase<DelegateToolCallsToolArgs> {
  async execute(
    args: DelegateToolCallsToolArgs,
    ctx: WorkflowExecution,
    parent: WorkflowBase,
  ): Promise<ToolResult> {
    const parts = args.message.parts;
    const resultParts: ToolUIPart[] = [];

    for (const part of parts) {
      if (!part.type.startsWith('tool-')) {
        continue;
      }

      const toolName = part.type.replace(/^tool-/, '');

      const tool = parent.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found.`);
      }
      const result = await tool.execute(part.input, ctx, parent);

      resultParts.push({
        type: part.type as any,
        toolCallId: part.toolCallId,
        output: {
          type: result.type || 'text',
          value: result.data,
        },
        input: part.input,
        state: 'output-available',
      } satisfies ToolUIPart);
    }

    const resultMessage = {
      id: args.message.id,
      role: 'assistant',
      parts: resultParts,
    } satisfies UIMessage;

    return {
      data: resultMessage,
    };
  }
}
