import { z } from 'zod';
import { Document } from '@loopstack/common';
import type { LlmContentBlock, LlmStopReason } from '../types/index.js';
import { LlmNormalizedMessageSchema } from '../types/index.js';

// ---------------------------------------------------------------------------
// Document content schema
// ---------------------------------------------------------------------------

export const LlmMessageDocumentContentSchema = LlmNormalizedMessageSchema;

export type LlmMessageDocumentContentType = z.infer<typeof LlmMessageDocumentContentSchema>;

// ---------------------------------------------------------------------------
// Document class
// ---------------------------------------------------------------------------

@Document({
  schema: LlmMessageDocumentContentSchema,
  uiConfig: import.meta.dirname + '/llm-message.document.yaml',
})
export class LlmMessageDocument {
  id?: string;
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
  stopReason?: LlmStopReason;
}

// ---------------------------------------------------------------------------
// Render helper — extracts text from message content
// ---------------------------------------------------------------------------

export function renderLlmMessage(doc: LlmMessageDocument): string {
  if (typeof doc.content === 'string') return doc.content;
  return doc.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}
