import { z } from 'zod';
import { Document } from '@loopstack/common';

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
  schema: OAuthPromptDocumentSchema,
  uiConfig: __dirname + '/oauth-prompt.document.yaml',
})
export class OAuthPromptDocument {
  provider: string;
  authUrl: string;
  state: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}
