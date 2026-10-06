import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAppConfig, buildAuthConfig, buildDatabaseOptions } from './loopstack-config.js';

const ENV_VARS = [
  'LOOPSTACK_AUTH',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_COOKIE_DOMAIN',
  'DATABASE_URL',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USERNAME',
  'DATABASE_NAME',
  'DATABASE_PASSWORD',
];

const DEV_AUTH_DISABLED_SECRET = 'dev-insecure-secret-auth-disabled';

beforeEach(() => {
  for (const name of ENV_VARS) vi.stubEnv(name, undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildAppConfig', () => {
  it('takes enableAuth from forRoot() options over LOOPSTACK_AUTH', async () => {
    vi.stubEnv('LOOPSTACK_AUTH', 'true');
    expect((await buildAppConfig({ enableAuth: false })()).enableAuth).toBe(false);
  });

  it('enables auth when LOOPSTACK_AUTH is "true"', async () => {
    vi.stubEnv('LOOPSTACK_AUTH', 'true');
    expect((await buildAppConfig({})()).enableAuth).toBe(true);
  });

  it('leaves auth disabled by default', async () => {
    expect((await buildAppConfig({})()).enableAuth).toBe(false);
  });
});

describe('buildAuthConfig', () => {
  describe('JWT secrets', () => {
    it('uses the dev secret for both keys when auth is disabled and no secret is given', async () => {
      const { jwt } = await buildAuthConfig({})();
      expect(jwt?.secret).toBe(DEV_AUTH_DISABLED_SECRET);
      expect(jwt?.refreshSecret).toBe(DEV_AUTH_DISABLED_SECRET);
    });

    it('leaves both keys unset when auth is enabled via options and no secret is given', async () => {
      const { jwt } = await buildAuthConfig({ enableAuth: true })();
      expect(jwt?.secret).toBeUndefined();
      expect(jwt?.refreshSecret).toBeUndefined();
    });

    it('leaves both keys unset when auth is enabled via LOOPSTACK_AUTH and no secret is given', async () => {
      vi.stubEnv('LOOPSTACK_AUTH', 'true');
      const { jwt } = await buildAuthConfig({})();
      expect(jwt?.secret).toBeUndefined();
      expect(jwt?.refreshSecret).toBeUndefined();
    });

    it('takes the secrets from forRoot() options over the env vars', async () => {
      vi.stubEnv('JWT_SECRET', 'env-secret');
      vi.stubEnv('JWT_REFRESH_SECRET', 'env-refresh');
      const { jwt } = await buildAuthConfig({
        enableAuth: true,
        auth: { jwt: { secret: 'opt-secret', refreshSecret: 'opt-refresh' } },
      })();
      expect(jwt?.secret).toBe('opt-secret');
      expect(jwt?.refreshSecret).toBe('opt-refresh');
    });

    it('falls back to JWT_SECRET and JWT_REFRESH_SECRET', async () => {
      vi.stubEnv('JWT_SECRET', 'env-secret');
      vi.stubEnv('JWT_REFRESH_SECRET', 'env-refresh');
      const { jwt } = await buildAuthConfig({ enableAuth: true })();
      expect(jwt?.secret).toBe('env-secret');
      expect(jwt?.refreshSecret).toBe('env-refresh');
    });

    it('signs refresh tokens with the access secret when no refresh secret is given', async () => {
      vi.stubEnv('JWT_SECRET', 'env-secret');
      expect((await buildAuthConfig({ enableAuth: true })()).jwt?.refreshSecret).toBe('env-secret');
    });
  });

  describe('cookie domain', () => {
    it('maps auth.jwt.cookieDomain from forRoot() options', async () => {
      vi.stubEnv('JWT_COOKIE_DOMAIN', '.env.example.com');
      const config = await buildAuthConfig({ auth: { jwt: { cookieDomain: '.example.com' } } })();
      expect(config.jwt?.cookieDomain).toBe('.example.com');
    });

    it('falls back to JWT_COOKIE_DOMAIN', async () => {
      vi.stubEnv('JWT_COOKIE_DOMAIN', '.example.com');
      expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBe('.example.com');
    });

    it('leaves the cookie domain unset when neither is given', async () => {
      expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBeUndefined();
    });

    it('treats an empty JWT_COOKIE_DOMAIN as unset', async () => {
      vi.stubEnv('JWT_COOKIE_DOMAIN', '');
      expect((await buildAuthConfig({})()).jwt?.cookieDomain).toBeUndefined();
    });
  });
});

describe('buildDatabaseOptions', () => {
  it('connects with the defaults when nothing is configured', () => {
    expect(buildDatabaseOptions({})).toEqual({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'postgres',
      password: 'admin',
      autoLoadEntities: true,
      synchronize: true,
      migrationsRun: false,
    });
  });

  it('reads the discrete DATABASE_* env vars', () => {
    vi.stubEnv('DATABASE_HOST', 'db.internal');
    vi.stubEnv('DATABASE_PORT', '6543');
    vi.stubEnv('DATABASE_USERNAME', 'loop');
    vi.stubEnv('DATABASE_NAME', 'loopstack');
    vi.stubEnv('DATABASE_PASSWORD', 'secret');
    expect(buildDatabaseOptions({})).toMatchObject({
      host: 'db.internal',
      port: 6543,
      username: 'loop',
      database: 'loopstack',
      password: 'secret',
    });
  });

  it('takes database options from forRoot() over the env vars', () => {
    vi.stubEnv('DATABASE_HOST', 'db.internal');
    vi.stubEnv('DATABASE_PORT', '6543');
    expect(buildDatabaseOptions({ database: { host: 'db.example.com', port: 7000 } })).toMatchObject({
      host: 'db.example.com',
      port: 7000,
    });
  });

  it('connects through DATABASE_URL when no database options are given', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@db.example.com:5432/app');
    vi.stubEnv('DATABASE_HOST', 'db.internal');
    const options = buildDatabaseOptions({});
    expect(options).toMatchObject({ type: 'postgres', url: 'postgres://u:p@db.example.com:5432/app' });
    expect(options).not.toHaveProperty('host');
  });

  it('ignores DATABASE_URL when database options are given', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@db.example.com:5432/app');
    const options = buildDatabaseOptions({ database: { host: 'db.internal' } });
    expect(options).toMatchObject({ host: 'db.internal' });
    expect(options).not.toHaveProperty('url');
  });
});
