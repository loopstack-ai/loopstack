import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

const MarkdownDocumentSchema = z.object({
  markdown: z.string(),
});

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Markdown Document.',
  },
  configFile: __dirname + '/markdown-document.yaml',
})
@WithArguments(MarkdownDocumentSchema)
export class MarkdownDocument implements DocumentInterface {}
