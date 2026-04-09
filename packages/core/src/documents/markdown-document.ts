import { z } from 'zod';
import { Document } from '@loopstack/common';

export const MarkdownDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

@Document({
  schema: MarkdownDocumentSchema,
  uiConfig: __dirname + '/markdown-document.yaml',
})
export class MarkdownDocument {
  markdown: string;
}
