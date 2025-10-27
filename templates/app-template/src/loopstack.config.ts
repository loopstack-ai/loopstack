import { registerAs } from '@nestjs/config';
import { AuthConfig } from '@loopstack/api';
import { AppConfig } from '@loopstack/core';

export const appConfig = registerAs<AppConfig>('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  isLocalMode: process.env.ENABLE_LOCAL_MODE === 'true',
}));

export const authConfig = registerAs<AuthConfig>('auth', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      throw new Error('CLIENT_ID and CLIENT_SECRET are required in production');
    }
  }

  return {
    jwt: {
      secret: process.env.JWT_SECRET || 'NO SECRET',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'NO SECRET',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    clientId: process.env.CLIENT_ID || '',
    clientSecret: process.env.CLIENT_SECRET || '',
    authCallback: process.env.AUTH_CALLBACK_URL || 'https://hub.loopstack.ai/api/v1/sso/validate',
  };
});

export const loopstackConfig = [
  appConfig,
  authConfig,
]