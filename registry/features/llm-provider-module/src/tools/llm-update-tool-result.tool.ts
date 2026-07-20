import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmMessageDocument } from '../documents/index.js';
import { LlmDelegateService } from '../services/llm-delegate.service.js';
import type { LlmDelegateResult } from '../types/index.js';

/**
 * Zod schema for `llm_update_tool_result` tool args (the pending `delegateResult`
 * and the `completedTool` to merge in).
 *
 * @public
 */
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

/**
 * Zod schema for `llm_update_tool_result` tool config (result persistence options).
 *
 * @public
 */
export const LlmUpdateToolResultConfigSchema = z.object({
  save: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

type LlmUpdateToolResultToolArgs = z.infer<typeof LlmUpdateToolResultToolSchema>;
type LlmUpdateToolResultConfig = z.infer<typeof LlmUpdateToolResultConfigSchema>;

/**
 * Tool that records an async tool completion and updates a pending delegate result.
 *
 * Handles the callback fired when a delegated tool finishes: it merges `completedTool` into the
 * supplied `delegateResult` via {@link LlmDelegateService} and returns the updated
 * {@link LlmDelegateResult}. Once all tool calls complete, results are saved as an
 * {@link LlmMessageDocument} unless `config.save` is `false`.
 *
 * @providedBy LlmProviderModule
 * @public
 */
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
  ): Promise<ToolEnvelope<LlmDelegateResult>> {
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
