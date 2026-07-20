import { z } from 'zod';
import {
  LlmResponseDoneEventSchema,
  LlmResponseErrorEventSchema,
  LlmResponseStartEventSchema,
  LlmResponseTextDeltaEventSchema,
  LlmResponseThinkingDeltaEventSchema,
  LlmResponseToolCallEventSchema,
} from './llm-events.schema.js';
import type { LlmResponseEvent } from './llm-events.schema.js';
import { StreamResetEventSchema } from './stream-events.schema.js';
import {
  DocumentCreatedEventSchema,
  WorkflowCreatedEventSchema,
  WorkflowUpdatedEventSchema,
} from './workflow-events.schema.js';
import {
  GitUpdatedEventSchema,
  SecretDeletedEventSchema,
  SecretUpsertedEventSchema,
} from './workspace-events.schema.js';

/**
 * Every message sent from the server to clients over the event stream
 * (`GET /api/v1/sse/stream`), discriminated by `type`. Server dispatch sites,
 * Studio, the SDK, and the CLI all share this single contract.
 */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  WorkflowCreatedEventSchema,
  WorkflowUpdatedEventSchema,
  DocumentCreatedEventSchema,
  SecretUpsertedEventSchema,
  SecretDeletedEventSchema,
  GitUpdatedEventSchema,
  LlmResponseStartEventSchema,
  LlmResponseTextDeltaEventSchema,
  LlmResponseThinkingDeltaEventSchema,
  LlmResponseToolCallEventSchema,
  LlmResponseDoneEventSchema,
  LlmResponseErrorEventSchema,
  StreamResetEventSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/**
 * The `type` discriminant of {@link ClientMessage}.
 */
export type ClientMessageType = ClientMessage['type'];

/**
 * Parses an incoming payload into a {@link ClientMessage}, throwing on
 * unknown event types or malformed payloads.
 */
export function parseClientMessage(value: unknown): ClientMessage {
  return ClientMessageSchema.parse(value);
}

/**
 * Returns whether the payload is a valid {@link ClientMessage}.
 */
export function isClientMessage(value: unknown): value is ClientMessage {
  return ClientMessageSchema.safeParse(value).success;
}

/**
 * Narrows a {@link ClientMessage} to the LLM streaming subset.
 */
export function isLlmResponseEvent(message: ClientMessage): message is LlmResponseEvent {
  return message.type.startsWith('llm.response.');
}
