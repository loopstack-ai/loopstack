import { AuthStrategy } from '@loopstack/shared';

export interface AuthConfig {
  strategies: AuthStrategy[];
  jwt?: {
    secret: string;
    expiresIn: string;
    refreshSecret?: string;
    refreshExpiresIn?: string;
    cookieDomain?: string;
  };
  clientId?: string;
  clientSecret?: string;
  authCallback?: string;
}