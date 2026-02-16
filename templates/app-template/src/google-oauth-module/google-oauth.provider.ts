import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OAuthProviderInterface, OAuthTokenSet } from '../oauth-module';
import { OAuthProviderRegistry } from '../oauth-module';

@Injectable()
export class GoogleOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  private readonly logger = new Logger(GoogleOAuthProvider.name);

  readonly providerId = 'google';
  readonly defaultScopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
    this.logger.log('Google OAuth provider registered');
  }

  private get clientId(): string {
    const id = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured');
    return id;
  }

  private get clientSecret(): string {
    const secret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    if (!secret) throw new Error('GOOGLE_CLIENT_SECRET is not configured');
    return secret;
  }

  private get redirectUri(): string {
    return this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI', '/oauth/callback');
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`Google token exchange failed: ${response.statusText}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
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
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google token refresh failed: ${response.status} ${body}`);
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
