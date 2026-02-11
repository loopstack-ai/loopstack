import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

export type FileDocumentType = z.infer<typeof FileDocumentSchema>;

@Document({
  configFile: __dirname + '/file-document.yaml',
})
export class FileDocument implements DocumentInterface {
  @Input({ schema: FileDocumentSchema })
  content: FileDocumentType;
}
