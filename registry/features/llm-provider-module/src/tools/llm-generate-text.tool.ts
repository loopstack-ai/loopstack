import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, DOCUMENT_STORE, TOOL_REGISTRY, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { DocumentStore, ToolRegistry } from '@loopstack/common';
import type { LlmContext } from '../contracts/index.js';
import { LLM_MODULE_CONFIG } from '../llm-provider.constants.js';
import type { LlmModuleConfig } from '../llm-provider.constants.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';
import { LlmToolsHelperService } from '../services/llm-tools-helper.service.js';
import type { LlmGenerateTextResult, LlmMessage, LlmResolvedTool, LlmResultMeta } from '../types/index.js';

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
  model: z.string().optional(),
  messagesSearchTag: z.string().optional(),
  providerConfig: z.record(z.string(), z.unknown()).optional(),
  tools: z.array(z.string()).optional(),
});

type LlmGenerateTextArgs = z.infer<typeof LlmGenerateTextArgsSchema>;
type LlmGenerateTextConfig = z.infer<typeof LlmGenerateTextConfigSchema>;

/** @deprecated Use LlmGenerateTextArgsSchema + LlmGenerateTextConfigSchema instead */
export const LlmGenerateTextToolSchema = LlmGenerateTextArgsSchema;

@Tool({
  name: 'llm_generate_text',
  uiConfig: {
    description:
      'Generates text using the configured LLM provider. ' +
      'Configure provider, model, system prompt, and tools via options.config.',
  },
  schema: LlmGenerateTextArgsSchema,
  configSchema: LlmGenerateTextConfigSchema,
})
export class LlmGenerateTextTool extends BaseTool<
  LlmGenerateTextArgs,
  LlmGenerateTextConfig,
  LlmGenerateTextResult,
  LlmResultMeta
> {
  @Inject() private readonly registry: LlmProviderRegistry;
  @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore;
  @Inject() private readonly toolsHelper: LlmToolsHelperService;
  @Inject(TOOL_REGISTRY) private readonly toolRegistry: ToolRegistry;
  @Inject(LLM_MODULE_CONFIG) private readonly moduleConfig: LlmModuleConfig;

  protected async handle(
    args: LlmGenerateTextArgs,
    options?: ToolCallOptions<LlmGenerateTextConfig>,
  ): Promise<ToolResult<LlmGenerateTextResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? this.moduleConfig.provider ?? 'claude');

    // Documents from DocumentStore (replaces this.ctx.runtime.documents)
    const ctx: LlmContext = { documents: this.documentStore.findAllDocuments() };

    // Resolve tool names (string[]) to BaseTool[] instances via ToolRegistry
    const toolNames = config?.tools;
    const toolInstances = toolNames?.length ? this.toolRegistry.getMany(toolNames) : [];
    const toolDefinitions: LlmResolvedTool[] | undefined =
      toolInstances.length > 0 ? this.toolsHelper.getToolDefinitions(toolInstances) : undefined;

    const providerArgs = {
      system: config?.system,
      messages: args?.messages as LlmMessage[] | undefined,
      prompt: args?.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      tools: toolDefinitions,
      model: config?.model ?? this.moduleConfig.model,
      providerConfig: config?.providerConfig,
    };

    console.log('[LlmGenerateTextTool] Resolved model:', providerArgs.model);

    const result = await provider.generateText(providerArgs, ctx);

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
