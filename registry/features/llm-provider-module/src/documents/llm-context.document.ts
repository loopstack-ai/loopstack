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
 * Hidden LLM conversation context. Persisted server-side and included by LLM providers
 * when building conversation history (`tag: 'message'`), but excluded from Studio's
 * document responses (`internal: true`) so it never renders as a chat bubble.
 *
 * Use to seed the model with system context, prior steps, or workflow background that
 * the end user shouldn't see in the UI.
 */
@Document({
  schema: LlmContextDocumentContentSchema,
  tags: ['message'],
  internal: true,
})
export class LlmContextDocument extends MessageDocument {
  declare role: 'user' | 'assistant';
}
