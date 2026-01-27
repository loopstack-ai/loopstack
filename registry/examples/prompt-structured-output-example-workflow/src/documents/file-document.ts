import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

@Injectable()
@BlockConfig({
  configFile: __dirname + '/file-document.yaml',
})
@WithArguments(FileDocumentSchema)
export class FileDocument extends DocumentBase {}
