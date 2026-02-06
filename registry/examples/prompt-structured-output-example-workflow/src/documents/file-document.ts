import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

@Injectable()
@Document({
  configFile: __dirname + '/file-document.yaml',
})
@WithArguments(FileDocumentSchema)
export class FileDocument implements DocumentInterface {}
