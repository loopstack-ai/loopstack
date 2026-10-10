import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenSet } from '@loopstack/oauth';

@Injectable()
export class GitHubOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  private readonly logger = new Logger(GitHubOAuthProvider.name);

  readonly providerId = 'github';
  readonly defaultScopes = ['repo', 'user', 'workflow', 'read:org'];

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
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`GitHub token exchange failed: ${response.statusText}`);
    }

    // GitHub reports a rejected exchange (bad code, wrong secret, redirect mismatch) with HTTP 200 and an error body.
    const tokens = (await response.json()) as {
      access_token?: string;
      token_type?: string;
      scope: string;
      error?: string;
      error_description?: string;
    };

    if (tokens.error || !tokens.access_token) {
      const reason = tokens.error_description ?? tokens.error ?? 'no access token returned';
      this.logger.error(`Token exchange failed: ${tokens.error ?? 'missing access_token'} ${reason}`);
      throw new Error(`GitHub token exchange failed: ${reason}`);
    }

    return {
      accessToken: tokens.access_token,
      expiresIn: 315360000,
      scope: tokens.scope,
    };
  }

  refreshToken(): Promise<OAuthTokenSet> {
    throw new Error('GitHub tokens do not expire and cannot be refreshed.');
  }
}
