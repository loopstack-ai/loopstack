import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
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
  uiConfig: {
    description: 'Handles async tool completion callbacks and updates the delegate result.',
  },
  schema: LlmUpdateToolResultToolSchema,
})
export class LlmUpdateToolResultTool extends BaseTool {
  @Inject() private readonly delegateService: LlmDelegateService;

  async call(args: LlmUpdateToolResultToolArgs): Promise<ToolResult<LlmDelegateResult>> {
    const result = await this.delegateService.updateToolResult(
      args.delegateResult as LlmDelegateResult,
      args.completedTool,
      this.ctx.workflow,
      this.ctx.app,
    );

    return { data: result };
  }
}
