export interface AuthConfig {
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