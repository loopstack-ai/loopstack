import { Block } from '@loopstack/shared';
import { z } from 'zod';
import { Document } from '../../abstract';

const MarkdownMessageDocumentSchema = z.object({
  title: z.string().optional(),
  markdown: z.string(),
});

@Block({
  config: {
    type: 'document',
    description: 'Markdown Message Document.',
  },
  properties: MarkdownMessageDocumentSchema,
  configSchema: MarkdownMessageDocumentSchema,
  configFile: __dirname + '/markdown-message-document.yaml',
})
export class MarkdownMessageDocument extends Document {}
