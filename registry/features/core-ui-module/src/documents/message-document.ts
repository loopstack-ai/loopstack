import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

const MessageDocumentSchema = z.object({
  role: z.string(),
  content: z.string(),
});

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Message Document.',
  },
  configFile: __dirname + '/message-document.yaml',
})
@WithArguments(MessageDocumentSchema)
export class MessageDocument extends DocumentBase {}
