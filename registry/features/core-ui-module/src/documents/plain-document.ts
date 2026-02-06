import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

const PlainDocumentSchema = z.object({
  text: z.string(),
});

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Plain Document.',
  },
  configFile: __dirname + '/plain-document.yaml',
})
@WithArguments(PlainDocumentSchema)
export class PlainDocument implements DocumentInterface {}
