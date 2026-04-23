import { MAX_URL_LENGTH } from '../constants';

export function validateURL(url: string): { ok: true; parsed: URL } | { ok: false; reason: string } {
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, reason: `URL exceeds ${MAX_URL_LENGTH} characters` };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'URL could not be parsed' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `unsupported protocol "${parsed.protocol}"` };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed' };
  }

  const parts = parsed.hostname.split('.');
  if (parts.length < 2) {
    return { ok: false, reason: 'hostname must be publicly resolvable' };
  }

  return { ok: true, parsed };
}

/**
 * A redirect is safe to follow automatically when it stays on the same
 * effective host (with `www.` normalization), the same protocol, and the
 * same port. Everything else is surfaced to the caller so the user can
 * decide whether to follow it explicitly.
 */
export function isPermittedRedirect(originalUrl: string, redirectUrl: string): boolean {
  try {
    const original = new URL(originalUrl);
    const redirect = new URL(redirectUrl);

    if (redirect.protocol !== original.protocol) return false;
    if (redirect.port !== original.port) return false;
    if (redirect.username || redirect.password) return false;

    const strip = (h: string) => h.replace(/^www\./, '');
    return strip(original.hostname) === strip(redirect.hostname);
  } catch {
    return false;
  }
}

const BINARY_CONTENT_TYPE_PREFIXES = ['application/pdf', 'image/', 'audio/', 'video/', 'application/octet-stream'];

export function isBinaryContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return BINARY_CONTENT_TYPE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
