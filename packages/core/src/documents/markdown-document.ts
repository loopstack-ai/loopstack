import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

const MarkdownDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Markdown Document.',
  },
  uiConfig: __dirname + '/markdown-document.yaml',
})
export class MarkdownDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: MarkdownDocumentSchema,
  })
  content: z.infer<typeof MarkdownDocumentSchema>;
}
