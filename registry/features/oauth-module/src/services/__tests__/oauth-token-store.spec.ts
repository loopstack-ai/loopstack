import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OAuthProviderRegistry } from '../oauth-provider-registry.js';
import { OAuthTokenStore, StoredTokens } from '../oauth-token-store.js';

const NOW = new Date('2026-01-01T00:00:00Z').getTime();

const provider = {
  providerId: 'acme',
  defaultScopes: [],
  buildAuthUrl: vi.fn(),
  exchangeCode: vi.fn(),
  refreshToken: vi.fn(),
};
const registry = { get: vi.fn() };

type Internals = {
  redis: { disconnect(): void } | null;
  providerRegistry: OAuthProviderRegistry;
};

function createStore(redis: Internals['redis'] = null): OAuthTokenStore {
  const store = new OAuthTokenStore();
  const internals = store as unknown as Internals;
  internals.redis?.disconnect();
  internals.redis = redis;
  internals.providerRegistry = registry as unknown as OAuthProviderRegistry;
  return store;
}

function tokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return { accessToken: 'at-old', refreshToken: 'rt-1', expiresAt: NOW + 3600_000, scope: 'profile', ...overrides };
}

describe('OAuthTokenStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    registry.get.mockReturnValue(provider);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('in-memory fallback', () => {
    let store: OAuthTokenStore;

    beforeEach(() => {
      store = createStore();
    });

    afterEach(() => {
      store.onModuleDestroy();
    });

    it('stores and reads tokens per user and provider', async () => {
      await store.storeTokens('user-1', 'acme', tokens());

      expect(await store.getTokens('user-1', 'acme')).toEqual(tokens());
      expect(await store.getTokens('user-2', 'acme')).toBeUndefined();
      expect(await store.getTokens('user-1', 'other')).toBeUndefined();
    });

    it('converts a token set into an absolute expiry', async () => {
      await store.storeFromTokenSet('user-1', 'acme', {
        accessToken: 'at-1',
        refreshToken: 'rt-1',
        expiresIn: 3600,
        scope: 'profile',
      });

      expect(await store.getTokens('user-1', 'acme')).toEqual({
        accessToken: 'at-1',
        refreshToken: 'rt-1',
        expiresAt: NOW + 3600_000,
        scope: 'profile',
      });
    });

    describe('getValidAccessToken', () => {
      it('returns undefined when no tokens are stored', async () => {
        expect(await store.getValidAccessToken('user-1', 'acme')).toBeUndefined();
        expect(provider.refreshToken).not.toHaveBeenCalled();
      });

      it('returns the stored token while it is valid', async () => {
        await store.storeTokens('user-1', 'acme', tokens());

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-old');
        expect(provider.refreshToken).not.toHaveBeenCalled();
      });

      it('refreshes a token within the 60s expiry margin and persists the result', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW + 30_000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', expiresIn: 1800, scope: 'profile' });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-new');
        expect(registry.get).toHaveBeenCalledWith('acme');
        expect(provider.refreshToken).toHaveBeenCalledWith('rt-1');
        expect(await store.getTokens('user-1', 'acme')).toEqual(
          tokens({ accessToken: 'at-new', expiresAt: NOW + 1800_000 }),
        );
      });

      it('stores a rotated refresh token and uses it for the next refresh', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValueOnce({
          accessToken: 'at-2',
          refreshToken: 'rt-2',
          expiresIn: 1800,
          scope: 'profile',
        });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-2');
        expect(await store.getTokens('user-1', 'acme')).toEqual(
          tokens({ accessToken: 'at-2', refreshToken: 'rt-2', expiresAt: NOW + 1800_000 }),
        );

        vi.setSystemTime(NOW + 1800_000);
        provider.refreshToken.mockResolvedValueOnce({
          accessToken: 'at-3',
          refreshToken: 'rt-3',
          expiresIn: 1800,
          scope: 'profile',
        });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-3');
        expect(provider.refreshToken.mock.calls).toEqual([['rt-1'], ['rt-2']]);
      });

      it('keeps the stored refresh token when the refresh returns none', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', expiresIn: 1800, scope: 'profile' });

        await store.getValidAccessToken('user-1', 'acme');

        expect((await store.getTokens('user-1', 'acme'))?.refreshToken).toBe('rt-1');
      });

      it('stores the scope returned by the refresh', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', expiresIn: 1800, scope: 'profile email' });

        await store.getValidAccessToken('user-1', 'acme');

        expect((await store.getTokens('user-1', 'acme'))?.scope).toBe('profile email');
      });

      it('keeps the stored scope when the refresh returns none', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', expiresIn: 1800, scope: '' });

        await store.getValidAccessToken('user-1', 'acme');

        expect((await store.getTokens('user-1', 'acme'))?.scope).toBe('profile');
      });

      it('treats a token set without expiresIn as not expiring', async () => {
        await store.storeFromTokenSet('user-1', 'acme', {
          accessToken: 'at-1',
          refreshToken: 'rt-1',
          scope: 'profile',
        });

        expect(await store.getTokens('user-1', 'acme')).toEqual({
          accessToken: 'at-1',
          refreshToken: 'rt-1',
          expiresAt: undefined,
          scope: 'profile',
        });

        vi.setSystemTime(NOW + 365 * 24 * 3600_000);

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-1');
        expect(provider.refreshToken).not.toHaveBeenCalled();
      });

      it('keeps a token without expiresIn or refresh token', async () => {
        await store.storeFromTokenSet('user-1', 'acme', { accessToken: 'at-1', scope: 'profile' });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-1');
        expect(await store.getTokens('user-1', 'acme')).toBeDefined();
      });

      it('stores no expiry when the refresh returns no expiresIn', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', scope: 'profile' });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-new');
        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-new');
        expect(provider.refreshToken).toHaveBeenCalledTimes(1);
      });

      it('refreshes an already expired token', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockResolvedValue({ accessToken: 'at-new', expiresIn: 3600, scope: 'profile' });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-new');
      });

      it('deletes the tokens and returns undefined when the refresh fails', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        provider.refreshToken.mockRejectedValue(new Error('invalid_grant'));

        expect(await store.getValidAccessToken('user-1', 'acme')).toBeUndefined();
        expect(await store.getTokens('user-1', 'acme')).toBeUndefined();
      });

      it('deletes the tokens when the provider is no longer registered', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ expiresAt: NOW - 1000 }));
        registry.get.mockImplementation(() => {
          throw new Error('OAuth provider "acme" is not registered.');
        });

        expect(await store.getValidAccessToken('user-1', 'acme')).toBeUndefined();
        expect(await store.getTokens('user-1', 'acme')).toBeUndefined();
      });

      it('deletes an expired token that has no refresh token', async () => {
        await store.storeTokens('user-1', 'acme', tokens({ refreshToken: undefined, expiresAt: NOW - 1000 }));

        expect(await store.getValidAccessToken('user-1', 'acme')).toBeUndefined();
        expect(provider.refreshToken).not.toHaveBeenCalled();
        expect(await store.getTokens('user-1', 'acme')).toBeUndefined();
      });
    });
  });

  describe('redis', () => {
    const redis = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      disconnect: vi.fn(),
    };
    let store: OAuthTokenStore;

    beforeEach(() => {
      store = createStore(redis);
    });

    it('keeps tokens with a refresh token for 30 days', async () => {
      await store.storeTokens('user-1', 'acme', tokens());

      expect(redis.set).toHaveBeenCalledWith('oauth:user-1:acme', JSON.stringify(tokens()), 'EX', 30 * 24 * 60 * 60);
    });

    it('expires tokens without a refresh token together with the access token', async () => {
      await store.storeTokens('user-1', 'acme', tokens({ refreshToken: undefined, expiresAt: NOW + 90_500 }));

      expect(redis.set).toHaveBeenCalledWith('oauth:user-1:acme', expect.any(String), 'EX', 91);
    });

    it('uses a minimum TTL of one second for already expired tokens', async () => {
      await store.storeTokens('user-1', 'acme', tokens({ refreshToken: undefined, expiresAt: NOW - 5000 }));

      expect(redis.set).toHaveBeenCalledWith('oauth:user-1:acme', expect.any(String), 'EX', 1);
    });

    it('keeps tokens without expiry or refresh token for 30 days', async () => {
      await store.storeFromTokenSet('user-1', 'acme', { accessToken: 'at-1', scope: 'profile' });

      expect(redis.set).toHaveBeenCalledWith('oauth:user-1:acme', expect.any(String), 'EX', 30 * 24 * 60 * 60);
    });

    it('treats a stored null expiry as not expiring', async () => {
      redis.get.mockResolvedValueOnce(
        JSON.stringify({ accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: null, scope: 'profile' }),
      );

      expect(await store.getValidAccessToken('user-1', 'acme')).toBe('at-1');
      expect(provider.refreshToken).not.toHaveBeenCalled();
    });

    it('reads and parses stored tokens', async () => {
      redis.get.mockResolvedValueOnce(JSON.stringify(tokens()));

      expect(await store.getTokens('user-1', 'acme')).toEqual(tokens());
      expect(redis.get).toHaveBeenCalledWith('oauth:user-1:acme');
    });

    it('returns undefined for a missing key', async () => {
      redis.get.mockResolvedValueOnce(null);

      expect(await store.getTokens('user-1', 'acme')).toBeUndefined();
    });

    it('deletes the key when an expired token cannot be refreshed', async () => {
      redis.get.mockResolvedValueOnce(JSON.stringify(tokens({ expiresAt: NOW - 1000 })));
      provider.refreshToken.mockRejectedValue(new Error('invalid_grant'));

      expect(await store.getValidAccessToken('user-1', 'acme')).toBeUndefined();
      expect(redis.del).toHaveBeenCalledWith('oauth:user-1:acme');
    });

    it('disconnects on module destroy', () => {
      store.onModuleDestroy();

      expect(redis.disconnect).toHaveBeenCalled();
    });
  });
});
