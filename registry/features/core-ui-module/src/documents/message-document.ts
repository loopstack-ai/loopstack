import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

const MessageDocumentSchema = z.object({
  role: z.string(),
  content: z.string(),
});

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Message Document.',
  },
  configFile: __dirname + '/message-document.yaml',
})
@WithArguments(MessageDocumentSchema)
export class MessageDocument implements DocumentInterface {}
