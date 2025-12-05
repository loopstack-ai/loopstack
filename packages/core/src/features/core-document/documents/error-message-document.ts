import { BlockConfig } from '@loopstack/common';
import { z } from 'zod';
import { Document } from '../models';

const ErrorMessageDocumentSchema = z.object({
  message: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Error Message Document.',
  },
  properties: ErrorMessageDocumentSchema,
  configSchema: ErrorMessageDocumentSchema,
  configFile: __dirname + '/error-message-document.yaml',
})
export class ErrorMessageDocument extends Document {}
