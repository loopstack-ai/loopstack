import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OAuthProviderInterface, OAuthTokenSet } from '../oauth-module';
import { OAuthProviderRegistry } from '../oauth-module';

@Injectable()
export class MicrosoftOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  private readonly logger = new Logger(MicrosoftOAuthProvider.name);

  readonly providerId = 'microsoft';
  readonly defaultScopes = ['openid', 'profile', 'email', 'offline_access'];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
    this.logger.log('Microsoft OAuth provider registered');
  }

  private get clientId(): string {
    const id = this.configService.get<string>('MICROSOFT_CLIENT_ID');
    if (!id) throw new Error('MICROSOFT_CLIENT_ID is not configured');
    return id;
  }

  private get clientSecret(): string {
    const secret = this.configService.get<string>('MICROSOFT_CLIENT_SECRET');
    if (!secret) throw new Error('MICROSOFT_CLIENT_SECRET is not configured');
    return secret;
  }

  private get redirectUri(): string {
    return this.configService.get<string>('MICROSOFT_OAUTH_REDIRECT_URI', '/oauth/callback');
  }

  private get tenantId(): string {
    return this.configService.get<string>('MICROSOFT_TENANT_ID', 'common');
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      response_mode: 'query',
      prompt: 'consent',
    });
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`Microsoft token exchange failed: ${response.statusText}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Microsoft token refresh failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }
}
