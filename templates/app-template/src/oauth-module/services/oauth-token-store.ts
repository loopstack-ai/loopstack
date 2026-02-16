import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OAuthTokenSet } from '../contracts';
import { OAuthProviderRegistry } from './oauth-provider-registry';

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

@Injectable()
export class OAuthTokenStore {
  private readonly logger = new Logger(OAuthTokenStore.name);
  private readonly tokens = new Map<string, StoredTokens>();

  @Inject()
  private readonly providerRegistry: OAuthProviderRegistry;

  private key(userId: string, providerId: string): string {
    return `${userId}:${providerId}`;
  }

  storeTokens(userId: string, providerId: string, tokens: StoredTokens): void {
    this.tokens.set(this.key(userId, providerId), tokens);
    this.logger.log(`Stored ${providerId} tokens for user ${userId}`);
  }

  storeFromTokenSet(userId: string, providerId: string, tokenSet: OAuthTokenSet): void {
    this.storeTokens(userId, providerId, {
      accessToken: tokenSet.accessToken,
      refreshToken: tokenSet.refreshToken,
      expiresAt: Date.now() + tokenSet.expiresIn * 1000,
      scope: tokenSet.scope,
    });
  }

  getTokens(userId: string, providerId: string): StoredTokens | undefined {
    return this.tokens.get(this.key(userId, providerId));
  }

  async getValidAccessToken(userId: string, providerId: string): Promise<string | undefined> {
    const k = this.key(userId, providerId);
    const stored = this.tokens.get(k);
    if (!stored) return undefined;

    if (Date.now() < stored.expiresAt - 60_000) {
      return stored.accessToken;
    }

    if (stored.refreshToken) {
      try {
        const provider = this.providerRegistry.get(providerId);
        const refreshed = await provider.refreshToken(stored.refreshToken);
        const updated: StoredTokens = {
          ...stored,
          accessToken: refreshed.accessToken,
          expiresAt: Date.now() + refreshed.expiresIn * 1000,
        };
        this.tokens.set(k, updated);
        this.logger.log(`Refreshed ${providerId} token for user ${userId}`);
        return updated.accessToken;
      } catch (e) {
        this.logger.warn(`Failed to refresh ${providerId} token for user ${userId}: ${e}`);
        this.tokens.delete(k);
        return undefined;
      }
    }

    this.tokens.delete(k);
    return undefined;
  }
}
