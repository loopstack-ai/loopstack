import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { LlmContext } from '../contracts';
import { LlmProviderRegistry } from '../services/llm-provider-registry';
import type { LlmGenerateObjectResult, LlmMessage, LlmResultMeta } from '../types';

export const LlmGenerateObjectArgsSchema = z.object({
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(z.any())]),
      }),
    )
    .optional(),
  outputSchema: z.record(z.string(), z.unknown()),
});

export const LlmGenerateObjectConfigSchema = z.object({
  provider: z.string().optional(),
  system: z.string().optional(),
  model: z.string().optional(),
  messagesSearchTag: z.string().optional(),
  providerConfig: z.record(z.string(), z.unknown()).optional(),
});

type LlmGenerateObjectArgs = z.infer<typeof LlmGenerateObjectArgsSchema>;
type LlmGenerateObjectConfig = z.infer<typeof LlmGenerateObjectConfigSchema>;

/** @deprecated Use LlmGenerateObjectArgsSchema + LlmGenerateObjectConfigSchema instead */
export const LlmGenerateObjectToolSchema = LlmGenerateObjectArgsSchema;

@Tool({
  uiConfig: {
    description:
      'Generates a structured object conforming to a JSON Schema using the configured LLM provider. ' +
      'Configure provider, model, and system prompt via @InjectTool config.',
  },
  schema: LlmGenerateObjectArgsSchema,
  configSchema: LlmGenerateObjectConfigSchema,
})
export class LlmGenerateObjectTool extends BaseTool<LlmGenerateObjectArgs, LlmGenerateObjectConfig> {
  @Inject() private readonly registry: LlmProviderRegistry;

  async call(
    args: LlmGenerateObjectArgs,
    options?: ToolCallOptions<LlmGenerateObjectConfig>,
  ): Promise<ToolResult<LlmGenerateObjectResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? 'claude');
    const ctx: LlmContext = {
      documents: this.ctx.runtime.documents,
      parent: this.ctx.parent,
      workspace: this.ctx.workspace,
    };

    const providerArgs = {
      system: config?.system,
      messages: args.messages as LlmMessage[] | undefined,
      prompt: args.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      model: config?.model,
      providerConfig: config?.providerConfig,
      outputSchema: args.outputSchema,
    };

    const result = await provider.generateObject(providerArgs, ctx);

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
