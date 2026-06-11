import { z } from 'zod';
import { Document } from '@loopstack/common';
import { UIContentBlockSchema, UIMessageSchema } from '@loopstack/contracts/types';
import type { LlmContentBlock, LlmStopReason } from '../types/index.js';

// ---------------------------------------------------------------------------
// Document content schema — loose shape: provide `text`, `blocks`, or both.
// ---------------------------------------------------------------------------

export const LlmMessageDocumentContentSchema = UIMessageSchema.extend({
  id: z.string().optional(),
  blocks: z.array(UIContentBlockSchema).optional(),
  stopReason: z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence']).optional(),
});

export type LlmMessageDocumentContentType = z.infer<typeof LlmMessageDocumentContentSchema>;

// ---------------------------------------------------------------------------
// Document class
// ---------------------------------------------------------------------------

@Document({
  schema: LlmMessageDocumentContentSchema,
  widget: import.meta.dirname + '/llm-message.document.yaml',
  tags: ['message'],
})
export class LlmMessageDocument {
  id?: string;
  role: 'user' | 'assistant';
  text?: string;
  blocks?: LlmContentBlock[];
  stopReason?: LlmStopReason;
}

// ---------------------------------------------------------------------------
// Render helper — plain text projection.
// Prefers the explicit `text` field; falls back to concatenated text blocks.
// ---------------------------------------------------------------------------

export function renderLlmMessage(doc: LlmMessageDocument): string {
  if (doc.text != null) return doc.text;
  return (doc.blocks ?? [])
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
