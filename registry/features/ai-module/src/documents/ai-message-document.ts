import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { DocumentBase } from '@loopstack/core';

const AiMessageDocumentSchema = z.object({
  id: z.string().optional(),
  role: z.union([
    z.literal('system'),
    z.literal('user'),
    z.literal('assistant'),
  ]),
  metadata: z.any().optional(),
  parts: z.array(z.any()),
});

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Ai Message Document.',
  },
  configFile: __dirname + '/ai-message-document.yaml',
})
@WithArguments(AiMessageDocumentSchema)
export class AiMessageDocument extends DocumentBase {}
