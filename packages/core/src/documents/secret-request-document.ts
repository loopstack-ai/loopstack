import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

const SecretRequestDocumentSchema = z
  .object({
    variables: z
      .array(
        z.object({
          key: z.string(),
          value: z.string().optional(),
        }),
      )
      .optional(),
  })
  .strict();

@Document({
  configFile: __dirname + '/secret-request-document.yaml',
})
export class SecretRequestDocument implements DocumentInterface {
  @Input({
    schema: SecretRequestDocumentSchema,
  })
  content: z.infer<typeof SecretRequestDocumentSchema>;
}
