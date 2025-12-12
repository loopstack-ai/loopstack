import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

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
