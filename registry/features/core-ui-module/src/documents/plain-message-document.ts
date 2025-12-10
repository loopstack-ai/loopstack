import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';

const PlainMessageDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Plain Message Document.',
  },
  configFile: __dirname + '/plain-message-document.yaml',
})
@WithArguments(PlainMessageDocumentSchema)
export class PlainMessageDocument extends DocumentBase {}
