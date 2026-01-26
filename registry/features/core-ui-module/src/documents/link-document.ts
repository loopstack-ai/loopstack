import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

const LinkDocumentSchema = z
  .object({
    icon: z.string().optional(),
    type: z.string().optional(),
    label: z.string().optional(),
    href: z.string(),
  })
  .strict();

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
