import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

export const OAuthPromptDocumentSchema = z
  .object({
    provider: z.string(),
    authUrl: z.string(),
    state: z.string(),
    status: z.enum(['pending', 'success', 'error']).default('pending'),
    message: z.string().optional(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'OAuth prompt document for initiating OAuth flows.',
  },
  configFile: __dirname + '/oauth-prompt.document.yaml',
})
export class OAuthPromptDocument implements DocumentInterface {
  @Input({
    schema: OAuthPromptDocumentSchema,
  })
  content: z.infer<typeof OAuthPromptDocumentSchema>;
}
