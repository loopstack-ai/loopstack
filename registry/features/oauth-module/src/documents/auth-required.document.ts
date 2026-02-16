import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

export const AuthRequiredDocumentSchema = z
  .object({
    provider: z.string(),
    message: z.string(),
    workflowName: z.string(),
    workspaceId: z.string(),
    scopes: z.array(z.string()).optional(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Displays an authentication required prompt with a link to the auth workflow and a retry button.',
  },
  configFile: __dirname + '/auth-required.document.yaml',
})
export class AuthRequiredDocument implements DocumentInterface {
  @Input({
    schema: AuthRequiredDocumentSchema,
  })
  content: z.infer<typeof AuthRequiredDocumentSchema>;
}
