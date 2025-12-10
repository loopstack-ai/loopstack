import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';

const MarkdownMessageDocumentSchema = z.object({
  title: z.string().optional(),
  markdown: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Markdown Message Document.',
  },
  configFile: __dirname + '/markdown-message-document.yaml',
})
@WithArguments(MarkdownMessageDocumentSchema)
export class MarkdownMessageDocument extends DocumentBase {}
