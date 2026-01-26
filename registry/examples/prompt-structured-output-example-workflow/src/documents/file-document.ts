import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

export const FileDocumentSchema = z.object({
  filename: z.string(),
  description: z.string().optional(),
  code: z.string(),
});

@Injectable()
@BlockConfig({
  configFile: __dirname + '/file-document.yaml',
})
@WithArguments(FileDocumentSchema)
export class FileDocument extends DocumentBase {}
