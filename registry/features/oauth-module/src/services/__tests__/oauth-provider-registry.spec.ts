import { describe, expect, it } from 'vitest';
import type { OAuthProviderInterface } from '../../contracts/index.js';
import { OAuthProviderRegistry } from '../oauth-provider-registry.js';

function fakeProvider(providerId: string): OAuthProviderInterface {
  return {
    providerId,
    defaultScopes: [],
    buildAuthUrl: () => '',
    exchangeCode: () => Promise.reject(new Error('unused')),
    refreshToken: () => Promise.reject(new Error('unused')),
  };
}

describe('OAuthProviderRegistry', () => {
  it('returns a registered provider by id', () => {
    const registry = new OAuthProviderRegistry();
    const google = fakeProvider('google');

    registry.register(google);

    expect(registry.has('google')).toBe(true);
    expect(registry.get('google')).toBe(google);
  });

  it('throws for an unregistered provider', () => {
    const registry = new OAuthProviderRegistry();

    expect(registry.has('github')).toBe(false);
    expect(() => registry.get('github')).toThrow('OAuth provider "github" is not registered.');
  });

  it('replaces a provider registered under the same id', () => {
    const registry = new OAuthProviderRegistry();
    const first = fakeProvider('google');
    const second = fakeProvider('google');

    registry.register(first);
    registry.register(second);

    expect(registry.get('google')).toBe(second);
  });
});
