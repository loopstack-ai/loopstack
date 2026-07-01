import { z } from 'zod';
import { Document } from '@loopstack/common';

/**
 * Zod schema for the secrets request form document — a list of variables, each with a `key` and an
 * optional `value`.
 *
 * @public
 */
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

/**
 * Document that renders the secrets request form in Studio, listing the secret keys the user is asked
 * to provide values for.
 *
 * @public
 */
@Document({
  schema: SecretRequestDocumentSchema,
  widget: './secret-request-document.yaml',
})
export class SecretRequestDocument {
  variables?: { key: string; value?: string }[];
}
