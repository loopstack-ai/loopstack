import { z } from 'zod';
import { Document, MessageDocument, MessageDocumentSchema } from '@loopstack/common';

/**
 * Document content schema — same shape as a basic message, narrowed to LLM roles.
 * Symmetric with `LlmMessageDocument` so context entries can be either user- or
 * assistant-flavored when seeding a conversation.
 */
export const LlmContextDocumentContentSchema = z.object({
  ...MessageDocumentSchema.shape,
  role: z.enum(['user', 'assistant']),
});

export type LlmContextDocumentContentType = z.infer<typeof LlmContextDocumentContentSchema>;

/**
 * Document that represents hidden LLM conversation context (never shown in Studio).
 *
 * Persisted server-side and included by LLM providers when building conversation history
 * (tagged `'message'`), but marked `internal: true` so it is excluded from Studio's document
 * responses and never renders as a chat bubble. Its `role` is narrowed to `'user' | 'assistant'`.
 * Use it to seed the model with system context, prior steps, or workflow background the end user
 * should not see.
 *
 * @public
 */
@Document({
  schema: LlmContextDocumentContentSchema,
  tags: ['message'],
  internal: true,
})
export class LlmContextDocument extends MessageDocument {
  declare role: 'user' | 'assistant';
}
