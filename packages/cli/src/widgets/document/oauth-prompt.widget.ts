import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

/**
 * `oauth-prompt` documents (`{ provider, authUrl, status, message? }`): the
 * sign-in link while pending, the confirmation once the browser round-trip
 * completed (the document is re-saved with `status: 'success'`). There is
 * nothing to collect — the provider redirect lands on the Studio callback
 * page, which fires `exchangeToken` server-side; the CLI only has to show
 * the URL and stay attached.
 */
export const oauthPromptWidget: DocumentWidget = (content, _ctx, out) => {
  const provider = typeof content.provider === 'string' ? content.provider : 'oauth';

  if (content.status === 'success') {
    const message = typeof content.message === 'string' ? content.message : 'Successfully connected.';
    out.block(`${pc.green('✓')} ${provider} connected — ${message}`);
    return;
  }

  const authUrl = typeof content.authUrl === 'string' ? content.authUrl : undefined;
  if (!authUrl) return;
  out.block(`⧉ sign in with ${provider}: ${authUrl}`);
};

/**
 * The pause-point instruction. The full URL is already on screen directly
 * above (the document render precedes the idle report) — repeating it only
 * doubles the noise, so the hint just points at it.
 */
export function oauthHandoff(content: Record<string, unknown>): string | undefined {
  if (content.status === 'success') return undefined;
  if (typeof content.authUrl !== 'string') return undefined;
  const provider = typeof content.provider === 'string' ? content.provider : 'oauth';
  return `waiting for browser sign-in (${provider}) — open the sign-in link above`;
}
