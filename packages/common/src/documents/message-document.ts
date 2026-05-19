import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const MessageDocumentSchema = z
  .object({
    role: z.string(),
    content: z.string(),
  })
  .strict();

@Document({
  schema: MessageDocumentSchema,
  uiConfig: import.meta.dirname + '/message-document.yaml',
})
export class MessageDocument {
  role: string;
  content: string;
}
