import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthSessionService } from '../oauth-session.service.js';

describe('OAuthSessionService (in-memory fallback)', () => {
  let service: OAuthSessionService;

  beforeEach(() => {
    service = new OAuthSessionService();
    // Force the in-memory path — tests must not depend on a local Redis.
    // Disconnect first: a live connection would keep the event loop (and
    // jest) alive.
    const internals = service as unknown as { redis: { disconnect(): void } | null };
    internals.redis?.disconnect();
    internals.redis = null;
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('hands a registered session out exactly once', async () => {
    await service.register('state-1', { workflowId: 'wf-1', userId: 'user-1', provider: 'google' });

    const first = await service.consume('state-1');
    expect(first).toEqual({ workflowId: 'wf-1', userId: 'user-1', provider: 'google' });

    const second = await service.consume('state-1');
    expect(second).toBeUndefined();
  });

  it('returns nothing for unknown states', async () => {
    expect(await service.consume('never-registered')).toBeUndefined();
  });

  it('expires sessions after the TTL', async () => {
    vi.useFakeTimers();
    try {
      await service.register('state-2', { workflowId: 'wf-2', userId: 'user-2', provider: 'github' });
      vi.setSystemTime(Date.now() + 11 * 60 * 1000);
      expect(await service.consume('state-2')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
