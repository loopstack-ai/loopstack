import { Block } from '@loopstack/shared';
import { z } from 'zod';
import { Document } from '../../abstract';

const PlainMessageDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
});

@Block({
  config: {
    type: 'document',
    description: 'Plain Message Document.',
  },
  properties: PlainMessageDocumentSchema,
  configSchema: PlainMessageDocumentSchema,
  configFile: __dirname + '/plain-message-document.yaml',
})
export class PlainMessageDocument extends Document {}
