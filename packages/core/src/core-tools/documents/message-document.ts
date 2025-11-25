import { BlockConfig } from '@loopstack/common';
import { z } from 'zod';
import { Document } from '../../workflow-processor';
import { Expose } from 'class-transformer';

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
export class MessageDocument extends Document {
  @Expose()
  role: string;

  @Expose()
  content: string;
}
