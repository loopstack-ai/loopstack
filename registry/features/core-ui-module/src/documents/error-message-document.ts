import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';

const ErrorMessageDocumentSchema = z.object({
  message: z.string(),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Error Message Document.',
  },
  configFile: __dirname + '/error-message-document.yaml',
})
@WithArguments(ErrorMessageDocumentSchema)
export class ErrorMessageDocument extends DocumentBase {}
