import type { CorsOptions } from 'cors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCorsOptions } from './build-cors-options.util.js';

type OriginFn = Extract<
  CorsOptions['origin'],
  (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => void
>;

function checkOrigin(cors: CorsOptions | false, origin: string | undefined): boolean {
  if (cors === false || typeof cors.origin !== 'function') {
    throw new Error('expected a function origin');
  }
  let allowed = false;
  (cors.origin as OriginFn)(origin, (_err, ok) => {
    allowed = ok ?? false;
  });
  return allowed;
}

describe('buildCorsOptions', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
    vi.restoreAllMocks();
  });

  it('passes through an explicit cors override verbatim', () => {
    const override: CorsOptions = { origin: 'https://example.com', credentials: true };
    expect(buildCorsOptions({ cors: override })).toBe(override);
  });

  it('passes through cors: false to disable CORS', () => {
    expect(buildCorsOptions({ cors: false })).toBe(false);
  });

  it('allows any localhost port by default', () => {
    const cors = buildCorsOptions({});
    expect(checkOrigin(cors, 'http://localhost:5173')).toBe(true);
    expect(checkOrigin(cors, 'http://localhost:3000')).toBe(true);
    expect(checkOrigin(cors, 'http://127.0.0.1:8080')).toBe(true);
    expect(checkOrigin(cors, 'https://localhost:4000')).toBe(true);
  });

  it('allows requests with no Origin header (same-origin / non-browser)', () => {
    expect(checkOrigin(buildCorsOptions({}), undefined)).toBe(true);
  });

  it('rejects arbitrary remote origins by default', () => {
    const cors = buildCorsOptions({});
    expect(checkOrigin(cors, 'https://evil.example.com')).toBe(false);
    expect(checkOrigin(cors, 'http://localhost.evil.com')).toBe(false);
  });

  it('allows configured origins via corsOrigins', () => {
    const cors = buildCorsOptions({ corsOrigins: ['https://app.example.com'] });
    expect(checkOrigin(cors, 'https://app.example.com')).toBe(true);
    expect(checkOrigin(cors, 'https://other.example.com')).toBe(false);
  });

  it('falls back to CORS_ORIGINS / FRONTEND_URL env (comma-separated)', () => {
    process.env.CORS_ORIGINS = 'https://a.example.com, https://b.example.com';
    const cors = buildCorsOptions({});
    expect(checkOrigin(cors, 'https://a.example.com')).toBe(true);
    expect(checkOrigin(cors, 'https://b.example.com')).toBe(true);
    expect(checkOrigin(cors, 'https://c.example.com')).toBe(false);
  });

  it('enables credentials on the default policy', () => {
    const cors = buildCorsOptions({});
    expect(cors === false ? null : cors.credentials).toBe(true);
  });
});
