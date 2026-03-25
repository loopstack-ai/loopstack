import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { OAuthTokenSet } from '../contracts';
import { OAuthProviderRegistry } from './oauth-provider-registry';

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

const KEY_PREFIX = 'oauth:';
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class OAuthTokenStore implements OnModuleDestroy {
  private readonly logger = new Logger(OAuthTokenStore.name);
  private readonly fallback = new Map<string, StoredTokens>();
  private redis: Redis | null;

  @Inject()
  private readonly providerRegistry: OAuthProviderRegistry;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      family: 0,
      ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
      lazyConnect: true,
      retryStrategy: () => null,
    });

    this.logger.log('Connecting to Redis for OAuth token storage...');
    this.redis.connect().catch((err: Error) => {
      this.logger.warn(`Redis not available for OAuth token storage, falling back to in-memory: ${err.message}`);
      this.redis?.disconnect();
      this.redis = null;
    });
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  private redisKey(userId: string, providerId: string): string {
    return `${KEY_PREFIX}${userId}:${providerId}`;
  }

  async storeTokens(userId: string, providerId: string, tokens: StoredTokens): Promise<void> {
    if (this.redis) {
      const key = this.redisKey(userId, providerId);
      const ttl = tokens.refreshToken
        ? THIRTY_DAYS_IN_SECONDS
        : Math.max(Math.ceil((tokens.expiresAt - Date.now()) / 1000), 1);
      await this.redis.set(key, JSON.stringify(tokens), 'EX', ttl);
      this.logger.log(`Stored ${providerId} tokens for user ${userId} in Redis (TTL: ${ttl}s)`);
    } else {
      this.fallback.set(`${userId}:${providerId}`, tokens);
      this.logger.log(`Stored ${providerId} tokens for user ${userId} in memory`);
    }
  }

  async storeFromTokenSet(userId: string, providerId: string, tokenSet: OAuthTokenSet): Promise<void> {
    await this.storeTokens(userId, providerId, {
      accessToken: tokenSet.accessToken,
      refreshToken: tokenSet.refreshToken,
      expiresAt: Date.now() + tokenSet.expiresIn * 1000,
      scope: tokenSet.scope,
    });
  }

  async getTokens(userId: string, providerId: string): Promise<StoredTokens | undefined> {
    if (this.redis) {
      const raw = await this.redis.get(this.redisKey(userId, providerId));
      this.logger.debug(`Retrieved ${providerId} tokens for user ${userId} from Redis: ${raw ? 'found' : 'not found'}`);
      return raw ? (JSON.parse(raw) as StoredTokens) : undefined;
    }
    return this.fallback.get(`${userId}:${providerId}`);
  }

  async getValidAccessToken(userId: string, providerId: string): Promise<string | undefined> {
    const stored = await this.getTokens(userId, providerId);
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
        await this.storeTokens(userId, providerId, updated);
        this.logger.log(`Refreshed ${providerId} token for user ${userId}`);
        return updated.accessToken;
      } catch (e) {
        this.logger.warn(`Failed to refresh ${providerId} token for user ${userId}: ${e}`);
        await this.deleteTokens(userId, providerId);
        return undefined;
      }
    }

    await this.deleteTokens(userId, providerId);
    return undefined;
  }

  private async deleteTokens(userId: string, providerId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(this.redisKey(userId, providerId));
    } else {
      this.fallback.delete(`${userId}:${providerId}`);
    }
  }
}
