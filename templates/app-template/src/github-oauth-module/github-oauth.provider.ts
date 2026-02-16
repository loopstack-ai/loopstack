import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OAuthProviderInterface, OAuthTokenSet } from '../oauth-module';
import { OAuthProviderRegistry } from '../oauth-module';

@Injectable()
export class GitHubOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  private readonly logger = new Logger(GitHubOAuthProvider.name);

  readonly providerId = 'github';
  readonly defaultScopes = ['read:user', 'user:email'];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
    this.logger.log('GitHub OAuth provider registered');
  }

  private get clientId(): string {
    const id = this.configService.get<string>('GITHUB_CLIENT_ID');
    if (!id) throw new Error('GITHUB_CLIENT_ID is not configured');
    return id;
  }

  private get clientSecret(): string {
    const secret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    if (!secret) throw new Error('GITHUB_CLIENT_SECRET is not configured');
    return secret;
  }

  private get redirectUri(): string {
    return this.configService.get<string>('GITHUB_OAUTH_REDIRECT_URI', '/oauth/callback');
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`GitHub token exchange failed: ${response.statusText}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      throw new Error('GitHub token exchange returned no access_token');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      // GitHub classic tokens don't expire; use 8h as a safe default
      expiresIn: tokens.expires_in ?? 28800,
      scope: tokens.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub token refresh failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? 28800,
      scope: data.scope,
    };
  }
}
