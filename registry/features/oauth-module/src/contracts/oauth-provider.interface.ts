/**
 * Token set returned by an OAuth provider after a code exchange or refresh.
 *
 * @public
 */
export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}

/**
 * Contract that an OAuth 2.0 provider implements to plug into the OAuth framework; implement it to add a new provider.
 *
 * @public
 */
export interface OAuthProviderInterface {
  readonly providerId: string;
  readonly defaultScopes: string[];

  buildAuthUrl(scopes: string[], state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
}
