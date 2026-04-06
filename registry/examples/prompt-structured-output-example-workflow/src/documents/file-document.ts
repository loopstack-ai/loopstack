import { z } from 'zod';
import { Document } from '@loopstack/common';

export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

export type FileDocumentType = z.infer<typeof FileDocumentSchema>;

@Document({
  schema: FileDocumentSchema,
  uiConfig: __dirname + '/file-document.yaml',
})
export class FileDocument {
  filename: string;
  description: string;
  code: string;
}
