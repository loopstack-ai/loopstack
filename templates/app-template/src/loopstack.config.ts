import { ConfigFactory, registerAs } from '@nestjs/config';
import { AuthConfig } from '@loopstack/api';
import { AppConfig } from '@loopstack/core';

export const appConfig: ReturnType<typeof registerAs<AppConfig>> = registerAs<AppConfig>('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  isLocalMode: process.env.ENABLE_LOCAL_MODE === 'true',
}));

export const authConfig: ReturnType<typeof registerAs<AuthConfig>> = registerAs<AuthConfig>('auth', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!process.env.CLIENT_ID) {
      throw new Error('CLIENT_ID is required in production');
    }
  }

  return {
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    clientId: process.env.CLIENT_ID || 'local',
    hub: {
      issuer: process.env.HUB_ISSUER || 'https://hub.loopstack.ai',
      jwksUri: process.env.HUB_JWKS_URI || 'https://hub.loopstack.ai/.well-known/jwks.json',
    },
  };
});

export const loopstackConfig: ConfigFactory[] = [appConfig, authConfig];
