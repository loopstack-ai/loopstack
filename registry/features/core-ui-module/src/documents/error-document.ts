import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

const ErrorDocumentSchema = z.object({
  error: z.string(),
});

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Error Document.',
  },
  configFile: __dirname + '/error-document.yaml',
})
@WithArguments(ErrorDocumentSchema)
export class ErrorDocument implements DocumentInterface {}
