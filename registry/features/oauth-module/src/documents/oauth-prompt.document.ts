import { z } from 'zod';
import { Document } from '@loopstack/common';

/**
 * Zod schema for `OAuthPromptDocument`.
 *
 * @public
 */
export const OAuthPromptDocumentSchema = z
  .object({
    provider: z.string(),
    authUrl: z.string(),
    state: z.string(),
    status: z.enum(['pending', 'success', 'error']).default('pending'),
    message: z.string().optional(),
  })
  .strict();

/**
 * Document that renders the OAuth authorization prompt (provider, auth URL, and connection status) in Studio.
 *
 * @public
 */
@Document({
  schema: OAuthPromptDocumentSchema,
  widget: './oauth-prompt.ui.yaml',
  tags: ['oauth'],
})
export class OAuthPromptDocument {
  provider: string;
  authUrl: string;
  state: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}
