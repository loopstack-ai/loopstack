import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const MessageDocumentSchema = z
  .object({
    role: z.string(),
    text: z.string().optional(),
  })
  .strict();

/**
 * Document that renders a chat message (`role` plus optional `text`) in Studio.
 *
 * @public
 */
@Document({
  schema: MessageDocumentSchema,
  widget: './message-document.yaml',
  tags: ['ui-message'],
})
export class MessageDocument {
  role: string;
  text?: string;
}
