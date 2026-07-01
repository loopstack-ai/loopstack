import { Inject } from '@nestjs/common';
import { toJSONSchema, z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { LlmContext } from '../contracts/index.js';
import { LLM_MODULE_CONFIG } from '../llm-provider.constants.js';
import type { LlmModuleConfig } from '../llm-provider.constants.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';
import type { LlmGenerateObjectResult, LlmMessage, LlmResultMeta } from '../types/index.js';

/**
 * Zod schema for `llm_generate_object` tool args (`prompt`/`messages` plus the
 * `outputSchema` the result must conform to).
 *
 * @public
 */
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
  outputSchema: z.custom<z.ZodTypeAny>((v) => v instanceof z.ZodType, {
    message: 'outputSchema must be a Zod schema',
  }),
});

/**
 * Zod schema for `llm_generate_object` tool config (`provider`, `model`, `system`,
 * `providerConfig`).
 *
 * @public
 */
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

/**
 * Tool that generates a structured object conforming to a Zod/JSON schema via the configured LLM provider.
 *
 * Takes a `prompt` or `messages` plus an `outputSchema` (a Zod schema converted to JSON Schema)
 * and resolves provider, model, and system prompt from `options.config`. Returns an
 * {@link LlmGenerateObjectResult} whose `data` matches the schema, with usage in {@link LlmResultMeta}.
 *
 * @providedBy LlmProviderModule
 * @public
 */
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
    ctx: RunContext,
    options?: ToolCallOptions<LlmGenerateObjectConfig>,
  ): Promise<ToolEnvelope<LlmGenerateObjectResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? this.moduleConfig.provider ?? 'claude');
    const llmCtx: LlmContext = { documents: this.documentStore.findAllDocuments() };

    const jsonSchema = toJSONSchema(args.outputSchema) as Record<string, unknown>;

    const providerArgs = {
      system: config?.system,
      messages: args.messages as LlmMessage[] | undefined,
      prompt: args.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      model: config?.model ?? this.moduleConfig.model,
      providerConfig: config?.providerConfig,
      outputSchema: jsonSchema,
    };

    const result = await provider.generateObject(providerArgs, llmCtx);
    const validated = args.outputSchema.parse(result.data);

    const usage = provider.extractUsage(result.response);

    return {
      data: { ...result, data: validated },
      metadata: {
        provider: provider.providerId,
        model: config?.model ?? this.moduleConfig.model ?? 'default',
        ...(usage && { usage }),
      },
    };
  }
}
