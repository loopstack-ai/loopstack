import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

const PlainDocumentSchema = z.object({
  text: z.string(),
});

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Plain Document.',
  },
  configFile: __dirname + '/plain-document.yaml',
})
@WithArguments(PlainDocumentSchema)
export class PlainDocument extends DocumentBase {}
