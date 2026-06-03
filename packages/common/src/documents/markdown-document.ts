import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const MarkdownDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

@Document({
  schema: MarkdownDocumentSchema,
  widget: import.meta.dirname + '/markdown-document.yaml',
})
export class MarkdownDocument {
  markdown: string;
}
