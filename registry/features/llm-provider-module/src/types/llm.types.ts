import { z } from 'zod';
import { UIContentBlockSchema, UIMessageSchema } from '@loopstack/contracts/types';
import type { UIContentBlock } from '@loopstack/contracts/types';

// ---------------------------------------------------------------------------
// Shared config schema — import in parent workflows/tools for args passthrough
// ---------------------------------------------------------------------------

/**
 * Zod schema for the shared LLM config — import in parent workflows/tools to pass
 * `model` through as args.
 *
 * @public
 */
export const LlmConfigSchema = z.object({
  model: z.string().optional(),
});

/**
 * Config for shared LLM passthrough, inferred from {@link LlmConfigSchema}.
 *
 * @public
 */
export type LlmConfig = z.infer<typeof LlmConfigSchema>;

// ---------------------------------------------------------------------------
// Content blocks & normalized message — re-exported from contracts
// ---------------------------------------------------------------------------

/**
 * Zod schema for a single LLM content block (text, tool call, tool result, etc.).
 *
 * @public
 */
export const LlmContentBlockSchema = UIContentBlockSchema;
/**
 * A single block of LLM message content (text, tool call, tool result, etc.).
 *
 * @public
 */
export type LlmContentBlock = UIContentBlock;

/**
 * Zod schema for a normalized LLM message, with optional `id`, `text`, structured
 * blocks, and `stopReason`.
 *
 * @public
 */
export const LlmNormalizedMessageSchema = UIMessageSchema.extend({
  id: z.string().optional(),
  text: z.string(),
  stopReason: z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence']).optional(),
});

/**
 * A provider-normalized LLM message, inferred from {@link LlmNormalizedMessageSchema}.
 *
 * @public
 */
export type LlmNormalizedMessage = z.infer<typeof LlmNormalizedMessageSchema>;

/**
 * The reason an LLM turn stopped (`end_turn`, `tool_use`, `max_tokens`, `stop_sequence`).
 *
 * @public
 */
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

/**
 * An inline message authors pass as prompt args — a `role` plus `text` and/or
 * structured `blocks`.
 *
 * @public
 */
export interface LlmMessage {
  role: 'user' | 'assistant';
  text?: string;
  blocks?: LlmContentBlock[];
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
  /** Stable ID used to correlate live stream events for one assistant response. */
  streamMessageId?: string;
  /** Optional live stream sink. Providers should still return the complete final response. */
  onStream?: LlmStreamHandler;
}

/**
 * Token usage stats reported by a provider for one LLM call.
 *
 * @public
 */
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  reasoningTokens?: number;
}

/**
 * Metadata returned by the LLM tools ({@link LlmResultMeta} carries the resolved
 * `provider`, `model`, and {@link LlmUsage}).
 *
 * @public
 */
export type LlmResultMeta = {
  /** The provider that produced this result (e.g. 'claude', 'openai'). */
  provider: string;
  /** The model that produced this result (e.g. 'claude-sonnet-4-6'). */
  model: string;
  usage?: LlmUsage;
};

/**
 * Result returned by the `generateText` provider operation (and `LlmGenerateTextTool`).
 *
 * - `message` — the normalized assistant message produced by the provider.
 * - `response` — the unmodified native API response (Anthropic.Message, OpenAI.ChatCompletion, etc.).
 *
 * @public
 */
export interface LlmGenerateTextResult {
  message: LlmNormalizedMessage;
  /** Unmodified native API response (Anthropic.Message, OpenAI.ChatCompletion, etc.). */
  response: unknown;
}

export type LlmStreamEvent =
  | { type: 'start'; messageId: string }
  | { type: 'text_delta'; messageId: string; delta: string }
  | { type: 'thinking_delta'; messageId: string; delta: string }
  | { type: 'tool_call'; messageId: string; id: string; name: string; args: Record<string, unknown> }
  | { type: 'done'; messageId: string; message: LlmNormalizedMessage }
  | { type: 'error'; messageId: string; error: string };

export type LlmStreamHandler = (event: LlmStreamEvent) => void | Promise<void>;

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

/**
 * Result returned by the `generateObject` provider operation (and `LlmGenerateObjectTool`)
 * — the structured `data` matching the output schema plus the native `response`.
 *
 * @public
 */
export interface LlmGenerateObjectResult {
  /** The structured data matching the outputSchema. */
  data: unknown;
  /** Unmodified native API response. */
  response: unknown;
}

// ---------------------------------------------------------------------------
// Delegate tool calls
// ---------------------------------------------------------------------------

/**
 * A single tool-call result collected during delegation (part of {@link LlmDelegateResult}).
 *
 * @public
 */
export interface LlmToolResultEntry {
  type: 'tool_result';
  toolCallId: string;
  content?: string;
  isError?: boolean;
}

/**
 * A single tool-call error collected during delegation (part of {@link LlmDelegateResult}).
 *
 * @public
 */
export interface LlmToolErrorEntry {
  toolName: string;
  toolCallId: string;
  message: string;
}

/**
 * Result returned by tool-call delegation (`LlmDelegateToolCallsTool` and `LlmUpdateToolResultTool`).
 *
 * - `allCompleted` — whether every delegated tool call has finished.
 * - `toolResults` — the collected `LlmToolResultEntry` items.
 * - `pendingCount` — number of tool calls still awaiting completion.
 * - `errorCount` / `hasErrors` / `errors` — error count, flag, and the `LlmToolErrorEntry` details.
 *
 * @public
 */
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
