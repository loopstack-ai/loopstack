import { BlockConfig } from '@loopstack/common';
import { z } from 'zod';
import { Document } from '@loopstack/core';
import { Expose } from 'class-transformer';

const FileDocumentSchema = z.object({
  filename: z.string(),
  description: z.string().optional(),
  code: z.string(),
});

@BlockConfig({
  properties: FileDocumentSchema,
  configFile: __dirname + '/file-document.yaml',
})
export class FileDocument extends Document {
  @Expose()
  filename: string;

  @Expose()
  description: string;

  @Expose()
  code: string;
}
