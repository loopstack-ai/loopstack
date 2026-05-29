import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { ClientMessageService } from '@loopstack/core';
import type { LlmContext } from '../contracts/index.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';
import type { LlmGenerateTextResult, LlmMessage, LlmResultMeta, LlmStreamEvent } from '../types/index.js';

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
  @Inject() private readonly clientMessageService: ClientMessageService;

  async call(
    args?: LlmGenerateTextArgs,
    options?: ToolCallOptions<LlmGenerateTextConfig>,
  ): Promise<ToolResult<LlmGenerateTextResult, LlmResultMeta>> {
    const config = options?.config;
    const provider = this.registry.get(config?.provider ?? 'claude');
    const ctx: LlmContext = {
      documents: this.ctx.runtime.documents,
      workflow: this.ctx.workflow,
      workspace: this.ctx.app,
    };

    const streamMessageId = this.canStreamToClient() ? randomUUID() : undefined;

    const providerArgs = {
      system: config?.system,
      messages: args?.messages as LlmMessage[] | undefined,
      prompt: args?.prompt,
      messagesSearchTag: config?.messagesSearchTag,
      tools: config?.tools,
      model: config?.model,
      providerConfig: config?.providerConfig,
      streamMessageId,
      onStream: streamMessageId ? (event: LlmStreamEvent) => this.dispatchStreamEvent(event) : undefined,
    };

    if (streamMessageId) {
      this.dispatchStreamEvent({ type: 'start', messageId: streamMessageId });
    }

    let result: LlmGenerateTextResult;
    try {
      result = await provider.generateText(providerArgs, ctx);
    } catch (error) {
      if (streamMessageId) {
        this.dispatchStreamEvent({
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
      this.dispatchStreamEvent({ type: 'done', messageId: streamMessageId, message: result.message });
    }

    return {
      data: result,
      metadata: {
        provider: provider.providerId,
        model: config?.model ?? 'default',
        ...(usage && { usage }),
      },
    };
  }

  private canStreamToClient(): boolean {
    return !!(this.ctx.run.workflowId && this.ctx.app.userId && this.clientMessageService.clientId);
  }

  private dispatchStreamEvent(event: LlmStreamEvent): void {
    const workflowId = this.ctx.run.workflowId;
    const userId = this.ctx.app.userId;
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
