import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

const LinkDocumentSchema = z
  .object({
    icon: z.string().optional(),
    type: z.string().optional(),
    label: z.string().optional(),
    href: z.string(),
  })
  .strict();

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Link Document.',
  },
  configFile: __dirname + '/link-document.yaml',
})
@WithArguments(LinkDocumentSchema)
export class LinkDocument implements DocumentInterface {}
