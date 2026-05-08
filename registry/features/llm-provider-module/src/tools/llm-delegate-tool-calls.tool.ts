import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { LlmDelegateService } from '../services/llm-delegate.service';
import { LlmNormalizedMessageSchema } from '../types';
import type { LlmContentBlock, LlmDelegateResult, LlmNormalizedMessage } from '../types';

export const LlmDelegateToolCallsToolSchema = z.object({
  message: LlmNormalizedMessageSchema,
  callback: z
    .object({
      transition: z.string(),
    })
    .optional(),
});

type LlmDelegateToolCallsToolArgs = z.infer<typeof LlmDelegateToolCallsToolSchema>;

@Tool({
  uiConfig: {
    description: 'Delegates tool calls from an LLM response. Resolves tools from the workflow and workspace.',
  },
  schema: LlmDelegateToolCallsToolSchema,
})
export class LlmDelegateToolCallsTool extends BaseTool {
  @Inject() private readonly delegateService: LlmDelegateService;

  async call(args: LlmDelegateToolCallsToolArgs): Promise<ToolResult<LlmDelegateResult>> {
    const message = args.message as LlmNormalizedMessage;
    const toolCalls = this.extractToolCalls(message);
    const result = await this.delegateService.delegateToolCalls(
      toolCalls,
      this.ctx.parent,
      this.ctx.workspace,
      args.callback,
    );

    return { data: result };
  }

  private extractToolCalls(message: LlmNormalizedMessage) {
    if (typeof message.content === 'string') return [];
    return message.content
      .filter((b): b is Extract<LlmContentBlock, { type: 'tool_call' }> => b.type === 'tool_call')
      .map((b) => ({ id: b.id, name: b.name, args: b.args }));
  }
}
