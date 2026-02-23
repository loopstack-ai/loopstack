export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  clientId: string;
  hub?: {
    issuer: string;
    jwksUri: string;
  };
}
