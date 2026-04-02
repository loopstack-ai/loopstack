import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

const LinkDocumentSchema = z
  .object({
    status: z.enum(['pending', 'success', 'failure']).optional(),
    label: z.string().optional(),
    href: z.string().optional(),
    embed: z.boolean().optional(),
    expanded: z.boolean().optional(),
  })
  .strict();

type LinkDocumentContent = z.infer<typeof LinkDocumentSchema>;

@Document({
  config: {
    type: 'document',
    description: 'Link Document.',
  },
  uiConfig: __dirname + '/link-document.yaml',
})
export class LinkDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: LinkDocumentSchema,
  })
  content: LinkDocumentContent;
}
