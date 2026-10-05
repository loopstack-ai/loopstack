import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthConfig } from '@loopstack/auth';
import { AppConfig } from '@loopstack/core';
import { LoopstackModuleOptions } from './interfaces/index.js';

/**
 * Signing key used only when auth is disabled (local dev). It must be rejected by
 * ConfigValidationService when auth is enabled, so it is intentionally recognizable.
 */
const DEV_AUTH_DISABLED_SECRET = 'dev-insecure-secret-auth-disabled';

function resolveEnableAuth(options: LoopstackModuleOptions): boolean {
  return options.enableAuth ?? process.env.LOOPSTACK_AUTH === 'true';
}

export function buildAppConfig(options: LoopstackModuleOptions) {
  return registerAs<AppConfig>('app', () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    enableAuth: resolveEnableAuth(options),
    trace: options.trace ?? process.env.LOOPSTACK_TRACE === 'true',
  }));
}

export function buildAuthConfig(options: LoopstackModuleOptions) {
  const auth = options.auth;

  return registerAs<AuthConfig>('auth', () => {
    // Dev fallback is applied only when auth is disabled: JwtAuthGuard short-circuits to the local
    // user, so the signing key is security-irrelevant there. When auth is enabled the secret is left
    // undefined so ConfigValidationService fails closed instead of trusting a hardcoded value.
    const enableAuth = resolveEnableAuth(options);
    const providedSecret = auth?.jwt?.secret ?? process.env.JWT_SECRET;
    const providedRefreshSecret = auth?.jwt?.refreshSecret ?? process.env.JWT_REFRESH_SECRET ?? providedSecret;
    const secret = providedSecret ?? (enableAuth ? undefined : DEV_AUTH_DISABLED_SECRET);
    const refreshSecret = providedRefreshSecret ?? (enableAuth ? undefined : DEV_AUTH_DISABLED_SECRET);

    return {
      jwt: {
        secret: secret as string,
        expiresIn: auth?.jwt?.expiresIn ?? process.env.JWT_EXPIRES_IN ?? '1h',
        refreshSecret: refreshSecret as string,
        refreshExpiresIn: auth?.jwt?.refreshExpiresIn ?? process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        // An empty value would emit `Domain=`; treat it as unset so the cookies stay host-only.
        cookieDomain: auth?.jwt?.cookieDomain || process.env.JWT_COOKIE_DOMAIN || undefined,
      },
      clientId: auth?.clientId ?? process.env.CLIENT_ID ?? 'local',
      hub: {
        issuer: auth?.hub?.issuer ?? process.env.HUB_ISSUER ?? 'https://hub.loopstack.ai',
        jwksUri: auth?.hub?.jwksUri ?? process.env.HUB_JWKS_URI ?? 'https://hub.loopstack.ai/.well-known/jwks.json',
      },
    };
  });
}

export function buildDatabaseOptions(options: LoopstackModuleOptions): TypeOrmModuleOptions {
  const db = options.database ?? {};
  // A single DATABASE_URL is honored (managed/hosted environments, PaaS) when no programmatic
  // database options are given; otherwise fall back to the discrete DATABASE_* vars + defaults.
  const databaseUrl = !options.database ? process.env.DATABASE_URL : undefined;

  return {
    type: 'postgres',
    ...(databaseUrl
      ? { url: databaseUrl }
      : {
          host: db.host ?? process.env.DATABASE_HOST ?? 'localhost',
          port: db.port ?? (Number(process.env.DATABASE_PORT) || 5432),
          username: db.username ?? process.env.DATABASE_USERNAME ?? 'postgres',
          database: db.database ?? process.env.DATABASE_NAME ?? 'postgres',
          password: db.password ?? process.env.DATABASE_PASSWORD ?? 'admin',
        }),
    autoLoadEntities: true,
    synchronize: true,
    migrationsRun: false,
  };
}
