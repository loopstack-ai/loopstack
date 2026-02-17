export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}

export interface OAuthProviderInterface {
  readonly providerId: string;
  readonly defaultScopes: string[];

  buildAuthUrl(scopes: string[], state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
}
