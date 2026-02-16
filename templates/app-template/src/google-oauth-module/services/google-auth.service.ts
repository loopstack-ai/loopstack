import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

/**
 * Stores and resolves Google OAuth tokens per user.
 *
 * Currently uses an in-memory store. For production, replace with a
 * database-backed implementation (e.g. TypeORM entity).
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly tokens = new Map<string, GoogleTokens>();

  constructor(private readonly configService: ConfigService) {}

  get clientId(): string {
    const id = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured');
    return id;
  }

  get clientSecret(): string {
    const secret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    if (!secret) throw new Error('GOOGLE_CLIENT_SECRET is not configured');
    return secret;
  }

  get redirectUri(): string {
    return this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI', '/oauth/callback');
  }

  storeTokens(userId: string, tokens: GoogleTokens): void {
    this.tokens.set(userId, tokens);
    this.logger.log(`Stored Google tokens for user ${userId}`);
  }

  getTokens(userId: string): GoogleTokens | undefined {
    return this.tokens.get(userId);
  }

  /**
   * Returns a valid access token for the user, or undefined if none exists.
   * Attempts silent refresh if the token is expired and a refresh token is available.
   */
  async getValidAccessToken(userId: string): Promise<string | undefined> {
    const stored = this.tokens.get(userId);
    if (!stored) return undefined;

    // Token still valid (with 60s buffer)
    if (Date.now() < stored.expiresAt - 60_000) {
      return stored.accessToken;
    }

    // Try refresh
    if (stored.refreshToken) {
      try {
        const refreshed = await this.refreshAccessToken(stored.refreshToken);
        const updated: GoogleTokens = {
          ...stored,
          accessToken: refreshed.accessToken,
          expiresAt: Date.now() + refreshed.expiresIn * 1000,
        };
        this.tokens.set(userId, updated);
        this.logger.log(`Refreshed Google token for user ${userId}`);
        return updated.accessToken;
      } catch (e) {
        this.logger.warn(`Failed to refresh Google token for user ${userId}: ${e}`);
        this.tokens.delete(userId);
        return undefined;
      }
    }

    // Expired, no refresh token
    this.tokens.delete(userId);
    return undefined;
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
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
      throw new Error(`Refresh failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }
}
