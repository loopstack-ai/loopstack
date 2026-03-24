import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

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
  configFile: __dirname + '/markdown-document.yaml',
})
export class MarkdownDocument implements DocumentInterface {
  @Input({
    schema: MarkdownDocumentSchema,
  })
  content: z.infer<typeof MarkdownDocumentSchema>;
}
