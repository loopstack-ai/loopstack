import { AuthStrategy } from '@loopstack/shared';
import { AuthConfig } from '@loopstack/auth';

export const authConfig: AuthConfig = {
  strategies: [AuthStrategy.JWT, AuthStrategy.DEV],
  jwt: {
    secret: process.env.JWT_SECRET ?? 'NO SECRET',
    expiresIn: '1h',
    refreshSecret: process.env.JWT_SECRET ?? 'NO SECRET',
    refreshExpiresIn: '7d',
  },
};