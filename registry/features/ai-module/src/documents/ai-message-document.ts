import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, WithArguments } from '@loopstack/common';

const AiMessageDocumentSchema = z.object({
  id: z.string().optional(),
  role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]),
  metadata: z.any().optional(),
  parts: z.array(z.any()),
});

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Ai Message Document.',
  },
  configFile: __dirname + '/ai-message-document.yaml',
})
@WithArguments(AiMessageDocumentSchema)
export class AiMessageDocument {}
