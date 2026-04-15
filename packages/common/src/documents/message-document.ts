import { z } from 'zod';
import { Document } from '../decorators/block.decorator';

export const MessageDocumentSchema = z
  .object({
    role: z.string(),
    content: z.string(),
  })
  .strict();

@Document({
  schema: MessageDocumentSchema,
  uiConfig: __dirname + '/message-document.yaml',
})
export class MessageDocument {
  role: string;
  content: string;
}
