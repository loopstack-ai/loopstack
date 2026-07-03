import { z } from 'zod';
import { UIMessageSchema } from '../types/types/ui-message.type.js';
import { ClientMessageBaseSchema } from './client-message-base.schema.js';

/**
 * A provider-normalized LLM message — the finalized payload of
 * `llm.response.done`.
 */
export const LlmNormalizedMessageSchema = UIMessageSchema.extend({
  id: z.string().optional(),
  text: z.string(),
  stopReason: z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence']).optional(),
});
export type LlmNormalizedMessage = z.infer<typeof LlmNormalizedMessageSchema>;

const LlmResponseEventBaseSchema = ClientMessageBaseSchema.extend({
  workflowId: z.string(),
  messageId: z.string(),
});

/**
 * Emitted once when an LLM call begins streaming to the client.
 */
export const LlmResponseStartEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.start'),
});
export type LlmResponseStartEvent = z.infer<typeof LlmResponseStartEventSchema>;

/**
 * A chunk of assistant output text.
 */
export const LlmResponseTextDeltaEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.text_delta'),
  delta: z.string(),
});
export type LlmResponseTextDeltaEvent = z.infer<typeof LlmResponseTextDeltaEventSchema>;

/**
 * A chunk of reasoning/thinking output.
 */
export const LlmResponseThinkingDeltaEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.thinking_delta'),
  delta: z.string(),
});
export type LlmResponseThinkingDeltaEvent = z.infer<typeof LlmResponseThinkingDeltaEventSchema>;

/**
 * The model requested a tool call.
 */
export const LlmResponseToolCallEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.tool_call'),
  id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});
export type LlmResponseToolCallEvent = z.infer<typeof LlmResponseToolCallEventSchema>;

/**
 * Streaming finished — carries the full normalized message. The persisted
 * document follows via `document.created`.
 */
export const LlmResponseDoneEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.done'),
  message: LlmNormalizedMessageSchema,
});
export type LlmResponseDoneEvent = z.infer<typeof LlmResponseDoneEventSchema>;

/**
 * Streaming aborted with an error.
 */
export const LlmResponseErrorEventSchema = LlmResponseEventBaseSchema.extend({
  type: z.literal('llm.response.error'),
  error: z.string(),
});
export type LlmResponseErrorEvent = z.infer<typeof LlmResponseErrorEventSchema>;

/**
 * All LLM streaming events, discriminated by `type`.
 */
export const LlmResponseEventSchema = z.discriminatedUnion('type', [
  LlmResponseStartEventSchema,
  LlmResponseTextDeltaEventSchema,
  LlmResponseThinkingDeltaEventSchema,
  LlmResponseToolCallEventSchema,
  LlmResponseDoneEventSchema,
  LlmResponseErrorEventSchema,
]);
export type LlmResponseEvent = z.infer<typeof LlmResponseEventSchema>;
