import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

const LinkDocumentSchema = z
  .object({
    icon: z.string().optional(),
    type: z.string().optional(),
    label: z.string().optional(),
    caption: z.string().optional(),
    href: z.string().optional(),
    embed: z.boolean().optional(),
    expanded: z.boolean().optional(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Link Document.',
  },
  configFile: __dirname + '/link-document.yaml',
})
export class LinkDocument implements DocumentInterface {
  @Input({
    schema: LinkDocumentSchema,
  })
  content: z.infer<typeof LinkDocumentSchema>;
}
