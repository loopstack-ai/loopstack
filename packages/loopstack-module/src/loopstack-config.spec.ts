import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildAuthConfig } from './loopstack-config.js';

describe('buildAuthConfig', () => {
  const OLD_COOKIE_DOMAIN = process.env.JWT_COOKIE_DOMAIN;

  beforeEach(() => {
    delete process.env.JWT_COOKIE_DOMAIN;
  });

  afterAll(() => {
    if (OLD_COOKIE_DOMAIN === undefined) {
      delete process.env.JWT_COOKIE_DOMAIN;
    } else {
      process.env.JWT_COOKIE_DOMAIN = OLD_COOKIE_DOMAIN;
    }
  });

  it('maps auth.jwt.cookieDomain from forRoot() options', async () => {
    process.env.JWT_COOKIE_DOMAIN = '.env.example.com';
    const config = await buildAuthConfig({ auth: { jwt: { cookieDomain: '.example.com' } } })();
    expect(config.jwt?.cookieDomain).toBe('.example.com');
  });

  it('falls back to JWT_COOKIE_DOMAIN', async () => {
    process.env.JWT_COOKIE_DOMAIN = '.example.com';
    expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBe('.example.com');
  });

  it('leaves the cookie domain unset when neither is given', async () => {
    expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBeUndefined();
  });

  it('treats an empty JWT_COOKIE_DOMAIN as unset', async () => {
    process.env.JWT_COOKIE_DOMAIN = '';
    expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBeUndefined();
  });
});
