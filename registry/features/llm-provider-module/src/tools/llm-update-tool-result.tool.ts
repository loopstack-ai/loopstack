import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmMessageDocument } from '../documents/index.js';
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

export const LlmUpdateToolResultConfigSchema = z.object({
  save: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

type LlmUpdateToolResultToolArgs = z.infer<typeof LlmUpdateToolResultToolSchema>;
type LlmUpdateToolResultConfig = z.infer<typeof LlmUpdateToolResultConfigSchema>;

@Tool({
  name: 'llm_update_tool_result',
  description: 'Handles async tool completion callbacks and updates the delegate result.',
  schema: LlmUpdateToolResultToolSchema,
  configSchema: LlmUpdateToolResultConfigSchema,
})
export class LlmUpdateToolResultTool extends BaseTool<
  LlmUpdateToolResultToolArgs,
  LlmUpdateToolResultConfig,
  LlmDelegateResult
> {
  @Inject() private readonly delegateService: LlmDelegateService;

  protected async handle(
    args: LlmUpdateToolResultToolArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<LlmUpdateToolResultConfig>,
  ): Promise<ToolResult<LlmDelegateResult>> {
    const result = await this.delegateService.updateToolResult(
      args.delegateResult as LlmDelegateResult,
      args.completedTool,
    );

    const config = options?.config;
    if (config?.save !== false && result.allCompleted && result.toolResults.length > 0) {
      await this.documentStore.save(
        LlmMessageDocument,
        {
          role: 'user',
          blocks: result.toolResults.map((tr) => ({
            type: 'tool_result' as const,
            toolCallId: tr.toolCallId,
            content: tr.content ?? '',
            isError: tr.isError ?? false,
          })),
        },
        { meta: { ...(config?.meta ?? {}) } },
      );
    }

    return { data: result };
  }
}
