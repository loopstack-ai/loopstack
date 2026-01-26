import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

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
