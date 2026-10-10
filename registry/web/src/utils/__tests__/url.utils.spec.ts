import { describe, expect, it } from 'vitest';
import { MAX_URL_LENGTH } from '../../constants.js';
import { isBinaryContentType, isPermittedRedirect, validateURL } from '../url.utils.js';

describe('validateURL', () => {
  it('accepts http and https URLs and returns the parsed URL', () => {
    const result = validateURL('https://example.com/docs?q=1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.hostname).toBe('example.com');
      expect(result.parsed.searchParams.get('q')).toBe('1');
    }
    expect(validateURL('http://example.com').ok).toBe(true);
  });

  it('rejects URLs longer than the maximum length', () => {
    const url = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;

    expect(validateURL(url)).toEqual({ ok: false, reason: `URL exceeds ${MAX_URL_LENGTH} characters` });
  });

  it('rejects strings that are not URLs', () => {
    expect(validateURL('not a url')).toEqual({ ok: false, reason: 'URL could not be parsed' });
  });

  it.each(['ftp://example.com/file', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/plain,hi'])(
    'rejects the non-http protocol of %s',
    (url) => {
      const result = validateURL(url);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/^unsupported protocol/);
    },
  );

  it('rejects URLs with embedded credentials', () => {
    expect(validateURL('https://user:secret@example.com/')).toEqual({
      ok: false,
      reason: 'URLs with embedded credentials are not allowed',
    });
    expect(validateURL('https://user@example.com/').ok).toBe(false);
  });

  it('rejects single-label hostnames', () => {
    expect(validateURL('http://localhost:3000/')).toEqual({
      ok: false,
      reason: 'hostname must be publicly resolvable',
    });
    expect(validateURL('http://intranet/').ok).toBe(false);
  });
});

describe('isPermittedRedirect', () => {
  it('allows redirects on the same host, protocol and port', () => {
    expect(isPermittedRedirect('https://example.com/a', 'https://example.com/b')).toBe(true);
  });

  it('treats www. and the bare domain as the same host', () => {
    expect(isPermittedRedirect('https://example.com/a', 'https://www.example.com/a')).toBe(true);
    expect(isPermittedRedirect('https://www.example.com/a', 'https://example.com/a')).toBe(true);
  });

  it('rejects a change of protocol', () => {
    expect(isPermittedRedirect('https://example.com/a', 'http://example.com/a')).toBe(false);
  });

  it('rejects a change of port', () => {
    expect(isPermittedRedirect('https://example.com/a', 'https://example.com:8443/a')).toBe(false);
  });

  it('rejects a different host, including subdomains', () => {
    expect(isPermittedRedirect('https://example.com/a', 'https://evil.com/a')).toBe(false);
    expect(isPermittedRedirect('https://example.com/a', 'https://docs.example.com/a')).toBe(false);
  });

  it('rejects redirects that add credentials', () => {
    expect(isPermittedRedirect('https://example.com/a', 'https://user:pw@example.com/a')).toBe(false);
  });

  it('rejects unparseable URLs', () => {
    expect(isPermittedRedirect('https://example.com/a', '/relative/path')).toBe(false);
    expect(isPermittedRedirect('nope', 'https://example.com/a')).toBe(false);
  });
});

describe('isBinaryContentType', () => {
  it.each(['application/pdf', 'image/png', 'audio/mpeg', 'video/mp4', 'application/octet-stream', 'IMAGE/JPEG'])(
    'treats %s as binary',
    (contentType) => {
      expect(isBinaryContentType(contentType)).toBe(true);
    },
  );

  it.each(['text/html; charset=utf-8', 'application/json', 'text/plain', 'application/xml'])(
    'treats %s as text',
    (contentType) => {
      expect(isBinaryContentType(contentType)).toBe(false);
    },
  );
});
