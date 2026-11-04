import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenSet } from '@loopstack/oauth';
import { MOCK_CLIENT_ID, MOCK_CLIENT_SECRET, mockServerUrl, oauthCallbackUrl } from './mock-provider.config';

/** The token endpoint's response, in the OAuth 2.0 format. */
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth provider for the mock authorization server in this app. It makes the standard OAuth 2.0
 * requests, so a provider for a real service differs only in its URLs and credentials.
 */
@Injectable()
export class MockOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  readonly providerId = 'mock';
  readonly defaultScopes = ['profile'];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MOCK_CLIENT_ID,
      redirect_uri: oauthCallbackUrl(this.configService),
      scope: scopes.join(' '),
      state,
    });
    return `${mockServerUrl(this.configService)}/authorize?${params.toString()}`;
  }

  exchangeCode(code: string): Promise<OAuthTokenSet> {
    return this.requestTokens({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthCallbackUrl(this.configService),
    });
  }

  refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    return this.requestTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async requestTokens(grant: Record<string, string>): Promise<OAuthTokenSet> {
    const response = await fetch(`${mockServerUrl(this.configService)}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ ...grant, client_id: MOCK_CLIENT_ID, client_secret: MOCK_CLIENT_SECRET }),
    });
    const tokens = (await response.json()) as TokenResponse;

    if (!response.ok || !tokens.access_token) {
      throw new Error(`Mock token request failed: ${tokens.error_description ?? tokens.error ?? response.statusText}`);
    }

    return {
      accessToken: tokens.access_token,
      // Present after a code exchange; a refresh returns none, and the token store keeps the old one.
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope ?? '',
    };
  }
}
