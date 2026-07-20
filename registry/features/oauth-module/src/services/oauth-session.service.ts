import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Pending OAuth flow registered when the authorization URL is built — the
 * lookup that lets the public callback complete the exchange from
 * `code` + `state` alone, regardless of who opened the URL (Studio popup,
 * CLI-printed link, plain browser).
 *
 * @public
 */
export interface OAuthSession {
  workflowId: string;
  userId: string;
  provider: string;
}

const KEY_PREFIX = 'oauth:session:';
const SESSION_TTL_SECONDS = 10 * 60;

/**
 * Service that registers pending OAuth flows by their CSRF `state` and hands
 * them out exactly once (Redis-backed with in-memory fallback, 10 minute
 * TTL) — the server-side `state → workflow` lookup behind the public OAuth
 * callback.
 *
 * @providedBy OAuthModule
 * @public
 */
@Injectable()
export class OAuthSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(OAuthSessionService.name);
  private readonly fallback = new Map<string, { session: OAuthSession; expiresAt: number }>();
  private redis: Redis | null;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      family: 0,
      ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
      lazyConnect: true,
      retryStrategy: () => null,
    });

    this.redis.connect().catch((err: Error) => {
      this.logger.warn(`Redis not available for OAuth sessions, falling back to in-memory: ${err.message}`);
      this.redis?.disconnect();
      this.redis = null;
    });
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  /** Registers a pending flow under its state token (expires after 10 minutes). */
  async register(state: string, session: OAuthSession): Promise<void> {
    if (this.redis) {
      await this.redis.set(`${KEY_PREFIX}${state}`, JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
    } else {
      this.fallback.set(state, { session, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 });
    }
  }

  /**
   * Hands out the session for a state token exactly once — the single-use
   * consumption is what makes the public callback safe to expose.
   */
  async consume(state: string): Promise<OAuthSession | undefined> {
    if (this.redis) {
      const raw = await this.redis.getdel(`${KEY_PREFIX}${state}`);
      return raw ? (JSON.parse(raw) as OAuthSession) : undefined;
    }
    const entry = this.fallback.get(state);
    this.fallback.delete(state);
    if (!entry || entry.expiresAt < Date.now()) return undefined;
    return entry.session;
  }
}
