import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const MessageDocumentSchema = z
  .object({
    role: z.string(),
    text: z.string().optional(),
  })
  .strict();

@Document({
  schema: MessageDocumentSchema,
  widget: import.meta.dirname + '/message-document.yaml',
  tags: ['ui-message'],
})
export class MessageDocument {
  role: string;
  text?: string;
}
