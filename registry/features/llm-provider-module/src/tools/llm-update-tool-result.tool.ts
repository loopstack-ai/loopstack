import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { LlmDelegateService } from '../services/llm-delegate.service.js';
import type { LlmDelegateResult } from '../types/index.js';

export const LlmUpdateToolResultToolSchema = z.object({
  delegateResult: z.object({
    allCompleted: z.boolean(),
    toolResults: z.array(z.any()),
    pendingCount: z.number(),
    errorCount: z.number().optional(),
    hasErrors: z.boolean().optional(),
    errors: z.array(z.any()).optional(),
  }),
  completedTool: z.any(),
});

type LlmUpdateToolResultToolArgs = z.infer<typeof LlmUpdateToolResultToolSchema>;

@Tool({
  name: 'llm_update_tool_result',
  description: 'Handles async tool completion callbacks and updates the delegate result.',
  schema: LlmUpdateToolResultToolSchema,
})
export class LlmUpdateToolResultTool extends BaseTool<LlmUpdateToolResultToolArgs, object, LlmDelegateResult> {
  @Inject() private readonly delegateService: LlmDelegateService;

  protected async handle(
    args: LlmUpdateToolResultToolArgs,
    ctx: LoopstackContext,
  ): Promise<ToolResult<LlmDelegateResult>> {
    const result = await this.delegateService.updateToolResult(
      args.delegateResult as LlmDelegateResult,
      args.completedTool,
    );

    return { data: result };
  }
}
