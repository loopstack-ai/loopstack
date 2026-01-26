import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

const MarkdownDocumentSchema = z.object({
  markdown: z.string(),
});

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Markdown Document.',
  },
  configFile: __dirname + '/markdown-document.yaml',
})
@WithArguments(MarkdownDocumentSchema)
export class MarkdownDocument extends DocumentBase {}
