import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';
import { Document } from '../../abstract';

const MessageDocumentSchema = z.object({
  role: z.string(),
  content: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Message Document.',
  },
  properties: MessageDocumentSchema,
  configSchema: MessageDocumentSchema,
  configFile: __dirname + '/message-document.yaml',
})
export class MessageDocument extends Document {}
