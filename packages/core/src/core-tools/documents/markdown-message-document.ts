import { BlockConfig } from '@loopstack/common';
import { z } from 'zod';
import { Document } from '../../workflow-processor';

const MarkdownMessageDocumentSchema = z.object({
  title: z.string().optional(),
  markdown: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Markdown Message Document.',
  },
  properties: MarkdownMessageDocumentSchema,
  configSchema: MarkdownMessageDocumentSchema,
  configFile: __dirname + '/markdown-message-document.yaml',
})
export class MarkdownMessageDocument extends Document {}
