export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  clientId: string;
  clientSecret: string;
  authCallback: string;
}