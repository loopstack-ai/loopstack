import { z } from 'zod';
import { Document } from '@loopstack/common';

export const SecretRequestDocumentSchema = z
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
  schema: SecretRequestDocumentSchema,
  uiConfig: __dirname + '/secret-request-document.yaml',
})
export class SecretRequestDocument {
  variables?: { key: string; value?: string }[];
}
