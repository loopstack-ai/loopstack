import { AuthStrategy } from '@loopstack/shared';
import { AuthConfig } from '@loopstack/auth';

export const authConfig: AuthConfig = {
  strategies: [AuthStrategy.JWT, AuthStrategy.HUB],
  jwt: {
    secret: process.env.JWT_SECRET ?? 'NO SECRET',
    expiresIn: '1h',
    refreshSecret: process.env.JWT_SECRET ?? 'NO SECRET',
    refreshExpiresIn: '7d',
  },
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  authCallback: process.env.AUTH_CALLBACK_URL || "https://studio.loopstack.ai/api/v1/sso/validate"
};