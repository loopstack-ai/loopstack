import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import type { LlmContext } from '../contracts/index.js';
import { LLM_MODULE_CONFIG } from '../llm-provider.constants.js';
import type { LlmModuleConfig } from '../llm-provider.constants.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';
import type { LlmGenerateObjectResult, LlmMessage, LlmResultMeta } from '../types/index.js';

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
  name: 'llm_generate_object',
  description:
    'Generates a structured object conforming to a JSON Schema using the configured LLM provider. ' +
    'Configure provider, model, and system prompt via options.config.',
  schema: LlmGenerateObjectArgsSchema,
  configSchema: LlmGenerateObjectConfigSchema,
})
export class LlmGenerateObjectTool extends BaseTool<
  LlmGenerateObjectArgs,
  LlmGenerateObjectConfig,
  LlmGenerateObjectResult,
  LlmResultMeta
> {
  @Inject() private readonly registry: LlmProviderRegistry;
  @Inject(LLM_MODULE_CONFIG) private readonly moduleConfig: LlmModuleConfig;

  protected async handle(
    args: LlmGenerateObjectArgs,
    ctx: LoopstackContext,
    options?: ToolCallOptions<LlmGenerateObjectConfig>,
  ): Promise<ToolResult<LlmGenerateObjectResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? this.moduleConfig.provider ?? 'claude');
    const llmCtx: LlmContext = { documents: this.documentStore.findAllDocuments() };

    const providerArgs = {
      system: config?.system,
      messages: args.messages as LlmMessage[] | undefined,
      prompt: args.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      model: config?.model ?? this.moduleConfig.model,
      providerConfig: config?.providerConfig,
      outputSchema: args.outputSchema,
    };

    const result = await provider.generateObject(providerArgs, llmCtx);

    const usage = provider.extractUsage(result.response);

    return {
      data: result,
      metadata: {
        provider: provider.providerId,
        model: config?.model ?? this.moduleConfig.model ?? 'default',
        ...(usage && { usage }),
      },
    };
  }
}
