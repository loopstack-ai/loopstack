import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { QuotaCheckResult, QuotaClientServiceInterface } from '../interfaces';

export const QUOTA_REDIS = 'QUOTA_REDIS';

@Injectable()
export class QuotaClientService implements QuotaClientServiceInterface {
  private readonly logger = new Logger(QuotaClientService.name);

  constructor(
    @Optional()
    @Inject(QUOTA_REDIS)
    private readonly redis: Redis | null,
  ) {}

  async checkQuota(userId: string, quotaType: string): Promise<QuotaCheckResult> {
    if (!this.redis) {
      return { exceeded: false, used: 0, limit: -1 };
    }

    const usedKey = this.key(userId, quotaType, 'used');
    const limitKey = this.key(userId, quotaType, 'limit');

    try {
      const [usedStr, limitStr] = await Promise.all([this.redis.get(usedKey), this.redis.get(limitKey)]);

      this.logger.debug(
        `Quota check for user=${userId} type=${quotaType}: usedKey=${usedKey} usedStr=${usedStr}, limitKey=${limitKey} limitStr=${limitStr}, redisHost=${this.redis.options?.host}:${this.redis.options?.port}`,
      );

      const used = usedStr ? parseInt(usedStr, 10) : 0;

      // No limit key means no quota assigned — block by default
      if (limitStr == null) {
        this.logger.warn(`No limit key found in Redis for user=${userId} type=${quotaType} — blocking by default`);
        return { exceeded: true, used, limit: 0 };
      }

      const limit = parseInt(limitStr, 10);

      // -1 means unlimited
      if (limit === -1) {
        return { exceeded: false, used, limit };
      }

      if (used >= limit) {
        return { exceeded: true, used, limit };
      }

      return { exceeded: false, used, limit };
    } catch (error) {
      this.logger.warn(
        `Quota check failed for user ${userId}, quota ${quotaType}: ${String(error)}. Allowing (fail-open).`,
      );
      return { exceeded: false, used: 0, limit: -1 };
    }
  }

  async report(userId: string, quotaType: string, amount: number): Promise<void> {
    if (!this.redis) {
      return;
    }

    const usedKey = this.key(userId, quotaType, 'used');

    try {
      await this.redis.incrby(usedKey, amount);
    } catch (error) {
      this.logger.warn(
        `Quota report failed for user ${userId}, quota ${quotaType}: ${String(error)}. Skipping (fail-open).`,
      );
    }
  }

  private key(userId: string, quotaType: string, suffix: string): string {
    return `user:${userId}:quota:${quotaType}:${suffix}`;
  }
}
