import { ToolUIPart, UIMessage } from 'ai';
import { z } from 'zod';
import { BlockConfig, ToolResult, WithArguments, getBlockTool } from '@loopstack/common';
import { ToolBase, WorkflowBase } from '@loopstack/core';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';

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

@BlockConfig({
  config: {
    description: 'Delegate a tool call.',
  },
})
@WithArguments(DelegateToolCallsToolSchema)
export class DelegateToolCall extends ToolBase<DelegateToolCallsToolArgs> {
  async execute(args: DelegateToolCallsToolArgs, ctx: WorkflowExecution, parent: WorkflowBase): Promise<ToolResult> {
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

      const tool = getBlockTool<ToolBase>(parent, toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found.`);
      }
      const result: ToolResult = await tool.execute(part.input as Record<string, unknown>, ctx, parent);

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
