import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, TOOL_REGISTRY, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { ToolRegistry } from '@loopstack/common';
import { ClientMessageService } from '@loopstack/core';
import type { LlmContext } from '../contracts/index.js';
import { LlmMessageDocument } from '../documents/index.js';
import { LLM_MODULE_CONFIG } from '../llm-provider.constants.js';
import type { LlmModuleConfig } from '../llm-provider.constants.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';
import { LlmToolsHelperService } from '../services/llm-tools-helper.service.js';
import type {
  LlmGenerateTextResult,
  LlmMessage,
  LlmResolvedTool,
  LlmResultMeta,
  LlmStreamEvent,
} from '../types/index.js';

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
  save: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

type LlmGenerateTextArgs = z.infer<typeof LlmGenerateTextArgsSchema>;
type LlmGenerateTextConfig = z.infer<typeof LlmGenerateTextConfigSchema>;

/** @deprecated Use LlmGenerateTextArgsSchema + LlmGenerateTextConfigSchema instead */
export const LlmGenerateTextToolSchema = LlmGenerateTextArgsSchema;

@Tool({
  name: 'llm_generate_text',
  description:
    'Generates text using the configured LLM provider. ' +
    'Configure provider, model, system prompt, and tools via options.config.',
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
  @Inject() private readonly toolsHelper: LlmToolsHelperService;
  @Inject(TOOL_REGISTRY) private readonly toolRegistry: ToolRegistry;
  @Inject(LLM_MODULE_CONFIG) private readonly moduleConfig: LlmModuleConfig;
  @Inject() private readonly clientMessageService: ClientMessageService;

  protected async handle(
    args: LlmGenerateTextArgs,
    ctx: RunContext,
    options?: ToolCallOptions<LlmGenerateTextConfig>,
  ): Promise<ToolEnvelope<LlmGenerateTextResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? this.moduleConfig.provider ?? 'claude');

    // Documents from DocumentStore (replaces this.ctx.runtime.documents)
    const llmCtx: LlmContext = { documents: this.documentStore.findAllDocuments() };

    // Resolve tool names (string[]) to BaseTool[] instances via ToolRegistry
    const toolNames = config?.tools;
    const toolInstances = toolNames?.length ? this.toolRegistry.getMany(toolNames) : [];
    const toolDefinitions: LlmResolvedTool[] | undefined =
      toolInstances.length > 0 ? this.toolsHelper.getToolDefinitions(toolInstances) : undefined;

    const streamMessageId = this.canStreamToClient(ctx) ? randomUUID() : undefined;

    const providerArgs = {
      system: config?.system,
      messages: args?.messages as LlmMessage[] | undefined,
      prompt: args?.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      tools: toolDefinitions,
      model: config?.model ?? this.moduleConfig.model,
      providerConfig: config?.providerConfig,
      streamMessageId,
      onStream: streamMessageId ? (event: LlmStreamEvent) => this.dispatchStreamEvent(ctx, event) : undefined,
    };

    if (streamMessageId) {
      this.dispatchStreamEvent(ctx, { type: 'start', messageId: streamMessageId });
    }

    let result: LlmGenerateTextResult;
    try {
      result = await provider.generateText(providerArgs, llmCtx);
    } catch (error) {
      if (streamMessageId) {
        this.dispatchStreamEvent(ctx, {
          type: 'error',
          messageId: streamMessageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

    const usage = provider.extractUsage(result.response);

    if (streamMessageId) {
      result.message.id = streamMessageId;
      this.dispatchStreamEvent(ctx, { type: 'done', messageId: streamMessageId, message: result.message });
    }

    if (config?.save !== false) {
      await this.documentStore.save(LlmMessageDocument, result.message, {
        meta: { response: result.response, provider: provider.providerId, ...(config?.meta ?? {}) },
      });
    }

    return {
      data: result,
      metadata: {
        provider: provider.providerId,
        model: config?.model ?? this.moduleConfig.model ?? 'default',
        ...(usage && { usage }),
      },
    };
  }

  private canStreamToClient(ctx: RunContext): boolean {
    return !!(ctx.workflowId && ctx.userId && this.clientMessageService.clientId);
  }

  private dispatchStreamEvent(ctx: RunContext, event: LlmStreamEvent): void {
    const workflowId = ctx.workflowId;
    const userId = ctx.userId;
    if (!workflowId || !userId) return;

    this.clientMessageService.dispatch({
      ...event,
      eventType: event.type,
      type: `llm.response.${event.type}`,
      userId,
      workerId: this.clientMessageService.clientId,
      workflowId,
    });
  }
}
