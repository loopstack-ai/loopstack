import { z } from 'zod';
import { UIContentBlockSchema, UIMessageSchema } from '@loopstack/contracts/types';
import type { UIContentBlock } from '@loopstack/contracts/types';

// ---------------------------------------------------------------------------
// Shared config schema — import in parent workflows/tools for args passthrough
// ---------------------------------------------------------------------------

export const LlmConfigSchema = z.object({
  model: z.string().optional(),
});

export type LlmConfig = z.infer<typeof LlmConfigSchema>;

// ---------------------------------------------------------------------------
// Content blocks & normalized message — re-exported from contracts
// ---------------------------------------------------------------------------

export const LlmContentBlockSchema = UIContentBlockSchema;
export type LlmContentBlock = UIContentBlock;

export const LlmNormalizedMessageSchema = UIMessageSchema.extend({
  id: z.string().optional(),
  stopReason: z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence']).optional(),
});

export type LlmNormalizedMessage = z.infer<typeof LlmNormalizedMessageSchema>;

export type LlmStopReason = NonNullable<LlmNormalizedMessage['stopReason']>;

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Messages (for inline prompt args)
// ---------------------------------------------------------------------------

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | unknown[];
}

// ---------------------------------------------------------------------------
// Generate text
// ---------------------------------------------------------------------------

export interface LlmGenerateTextArgs<TProviderConfig = Record<string, unknown>> {
  system?: string;
  messages?: LlmMessage[];
  prompt?: string;
  messagesSearchTag?: string;
  tools?: LlmResolvedTool[];
  model?: string;
  /** Provider-specific config (e.g. maxTokens, temperature, cache). Opaque to the framework. */
  providerConfig?: TProviderConfig;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  reasoningTokens?: number;
}

/** Typed metadata returned by LLM tools (LlmGenerateTextTool, LlmGenerateObjectTool). */
export type LlmResultMeta = {
  /** The provider that produced this result (e.g. 'claude', 'openai'). */
  provider: string;
  /** The model that produced this result (e.g. 'claude-sonnet-4-6'). */
  model: string;
  usage?: LlmUsage;
};

export interface LlmGenerateTextResult {
  message: LlmNormalizedMessage;
  /** Unmodified native API response (Anthropic.Message, OpenAI.ChatCompletion, etc.). */
  response: unknown;
}

// ---------------------------------------------------------------------------
// Generate object (structured output)
// ---------------------------------------------------------------------------

export interface LlmGenerateObjectArgs<TProviderConfig = Record<string, unknown>> {
  system?: string;
  messages?: LlmMessage[];
  prompt?: string;
  messagesSearchTag?: string;
  model?: string;
  providerConfig?: TProviderConfig;
  /** JSON Schema that the output must conform to. */
  outputSchema: Record<string, unknown>;
}

export interface LlmGenerateObjectResult {
  /** The structured data matching the outputSchema. */
  data: unknown;
  /** Unmodified native API response. */
  response: unknown;
}

// ---------------------------------------------------------------------------
// Delegate tool calls
// ---------------------------------------------------------------------------

export interface LlmToolResultEntry {
  type: 'tool_result';
  toolCallId: string;
  content?: string;
  isError?: boolean;
}

export interface LlmToolErrorEntry {
  toolName: string;
  toolCallId: string;
  message: string;
}

export interface LlmDelegateResult {
  allCompleted: boolean;
  toolResults: LlmToolResultEntry[];
  pendingCount: number;
  errorCount: number;
  hasErrors: boolean;
  errors: LlmToolErrorEntry[];
}

// ---------------------------------------------------------------------------
// Tool definitions (provider-agnostic, shared helper output)
// ---------------------------------------------------------------------------

export interface LlmToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmServerToolDefinition {
  name: string;
  config: unknown;
}

export type LlmResolvedTool =
  | ({ type: 'tool' } & LlmToolDefinition)
  | ({ type: 'server_tool' } & LlmServerToolDefinition);
