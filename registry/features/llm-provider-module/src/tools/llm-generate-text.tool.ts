import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { LlmContext } from '../contracts';
import { LlmProviderRegistry } from '../services/llm-provider-registry';
import type { LlmGenerateTextResult, LlmMessage, LlmResultMeta } from '../types';

export const LlmGenerateTextArgsSchema = z.object({
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(z.any())]),
      }),
    )
    .optional(),
});

export const LlmGenerateTextConfigSchema = z.object({
  provider: z.string().optional(),
  system: z.string().optional(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  messagesSearchTag: z.string().optional(),
  providerConfig: z.record(z.string(), z.unknown()).optional(),
});

type LlmGenerateTextArgs = z.infer<typeof LlmGenerateTextArgsSchema>;
type LlmGenerateTextConfig = z.infer<typeof LlmGenerateTextConfigSchema>;

/** @deprecated Use LlmGenerateTextArgsSchema + LlmGenerateTextConfigSchema instead */
export const LlmGenerateTextToolSchema = LlmGenerateTextArgsSchema;

@Tool({
  uiConfig: {
    description:
      'Generates text using the configured LLM provider. ' +
      'Configure provider, model, system prompt, and tools via @InjectTool config.',
  },
  schema: LlmGenerateTextArgsSchema,
  configSchema: LlmGenerateTextConfigSchema,
})
export class LlmGenerateTextTool extends BaseTool<LlmGenerateTextArgs, LlmGenerateTextConfig> {
  @Inject() private readonly registry: LlmProviderRegistry;

  async call(
    args?: LlmGenerateTextArgs,
    options?: ToolCallOptions<LlmGenerateTextConfig>,
  ): Promise<ToolResult<LlmGenerateTextResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? 'claude');
    const ctx: LlmContext = {
      documents: this.ctx.runtime.documents,
      parent: this.ctx.parent,
      workspace: this.ctx.workspace,
    };

    const providerArgs = {
      system: config?.system,
      messages: args?.messages as LlmMessage[] | undefined,
      prompt: args?.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      tools: config?.tools,
      model: config?.model,
      providerConfig: config?.providerConfig,
    };

    const result = await provider.generateText(providerArgs, ctx);

    const usage = provider.extractUsage(result.response);

    return {
      data: result,
      metadata: {
        provider: provider.providerId,
        model: config?.model ?? 'default',
        ...(usage && { usage }),
      },
    };
  }
}
