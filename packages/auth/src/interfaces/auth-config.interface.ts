import { AuthStrategy } from '@loopstack/shared';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope?: string[];
}

export interface AuthConfig {
  strategies: AuthStrategy[];
  jwt?: {
    secret: string;
    expiresIn: string;
    refreshSecret?: string;
    refreshExpiresIn?: string;
    cookieDomain?: string;
  };
  oauth?: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
    facebook?: OAuthProviderConfig;
  };
}