import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmMessageDocument } from '../documents/index.js';
import { LlmDelegateService } from '../services/llm-delegate.service.js';
import { LlmNormalizedMessageSchema } from '../types/index.js';
import type { LlmContentBlock, LlmDelegateResult, LlmNormalizedMessage } from '../types/index.js';

/**
 * Zod schema for `llm_delegate_tool_calls` tool args (the LLM `message` and the
 * `callback.transition` to fire on completion).
 *
 * @public
 */
export const LlmDelegateToolCallsToolSchema = z.object({
  message: LlmNormalizedMessageSchema,
  callback: z.object({
    transition: z.string(),
  }),
});

/**
 * Zod schema for `llm_delegate_tool_calls` tool config (result persistence options).
 *
 * @public
 */
export const LlmDelegateToolCallsConfigSchema = z.object({
  save: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

type LlmDelegateToolCallsToolArgs = z.infer<typeof LlmDelegateToolCallsToolSchema>;
type LlmDelegateToolCallsConfig = z.infer<typeof LlmDelegateToolCallsConfigSchema>;

/**
 * Tool that executes the tool calls contained in an LLM response.
 *
 * Extracts tool-use blocks from the normalized `message`, resolves them via the ToolRegistry,
 * and runs them through {@link LlmDelegateService}, scheduling async completions against the
 * provided `callback.transition`. Returns an {@link LlmDelegateResult} summarizing completed,
 * pending, and errored tool calls, and saves the results as an {@link LlmMessageDocument}
 * unless `config.save` is `false`.
 *
 * @providedBy LlmProviderModule
 * @public
 */
@Tool({
  name: 'llm_delegate_tool_calls',
  description: 'Delegates tool calls from an LLM response. Resolves tools via ToolRegistry.',
  schema: LlmDelegateToolCallsToolSchema,
  configSchema: LlmDelegateToolCallsConfigSchema,
})
export class LlmDelegateToolCallsTool extends BaseTool<
  LlmDelegateToolCallsToolArgs,
  LlmDelegateToolCallsConfig,
  LlmDelegateResult
> {
  @Inject() private readonly delegateService: LlmDelegateService;

  protected async handle(
    args: LlmDelegateToolCallsToolArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<LlmDelegateToolCallsConfig>,
  ): Promise<ToolEnvelope<LlmDelegateResult>> {
    const message = args.message as LlmNormalizedMessage;
    const toolCalls = this.extractToolCalls(message);
    const result = await this.delegateService.delegateToolCalls(toolCalls, args.callback);

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

  private extractToolCalls(message: LlmNormalizedMessage) {
    return (message.blocks ?? [])
      .filter((b): b is Extract<LlmContentBlock, { type: 'tool_call' }> => b.type === 'tool_call')
      .map((b) => ({ id: b.id, name: b.name, args: b.args }));
  }
}
