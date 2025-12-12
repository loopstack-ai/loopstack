import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

const ErrorDocumentSchema = z.object({
  error: z.string(),
});

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Error Document.',
  },
  configFile: __dirname + '/error-document.yaml',
})
@WithArguments(ErrorDocumentSchema)
export class ErrorDocument extends DocumentBase {}
