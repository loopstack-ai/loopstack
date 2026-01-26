import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

const LinkDocumentSchema = z.object({
  icon: z.string().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  href: z.string(),
}).strict();

@Injectable()
@BlockConfig({
  config: {
    type: 'document',
    description: 'Link Document.',
  },
  configFile: __dirname + '/link-document.yaml',
})
@WithArguments(LinkDocumentSchema)
export class LinkDocument extends DocumentBase {}
