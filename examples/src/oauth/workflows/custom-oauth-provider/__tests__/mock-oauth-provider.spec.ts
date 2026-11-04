import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OAuthProviderRegistry } from '@loopstack/oauth';
import { MockApiClient } from '../mock-provider/mock-api.client';
import { MockAuthorizationServerController } from '../mock-provider/mock-authorization-server.controller';
import { MockOAuthProvider } from '../mock-provider/mock-oauth.provider';

/**
 * The provider and the API client make real HTTP requests to the mock server, which runs on a local
 * port in this process. Nothing leaves the machine.
 */
describe('MockOAuthProvider', () => {
  const config = new ConfigService();
  const provider = new MockOAuthProvider(config, new OAuthProviderRegistry());
  const api = new MockApiClient(config);
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MockAuthorizationServerController],
      providers: [{ provide: ConfigService, useValue: config }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    config.set('PORT', (app.getHttpServer().address() as AddressInfo).port);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Opens the authorization URL and follows the consent page's Allow link, as the user would. */
  async function authorize(scopes: string[], state: string): Promise<URL> {
    const page = await (await fetch(provider.buildAuthUrl(scopes, state))).text();
    const href = page.match(/id="allow" href="([^"]+)"/)![1].replaceAll('&amp;', '&');
    return new URL(href);
  }

  it('registers itself under its provider id', () => {
    const registry = new OAuthProviderRegistry();
    const registered = new MockOAuthProvider(config, registry);

    registered.onModuleInit();

    expect(registry.get('mock')).toBe(registered);
  });

  it('signs in, calls the API, and refreshes the token', async () => {
    const redirect = await authorize(['profile'], 'state-1');
    expect(`${redirect.origin}${redirect.pathname}`).toBe(
      `http://localhost:${config.get('PORT')}/api/v1/oauth/callback`,
    );
    expect(redirect.searchParams.get('state')).toBe('state-1');

    const tokens = await provider.exchangeCode(redirect.searchParams.get('code')!);
    expect(tokens).toMatchObject({ expiresIn: 3600, scope: 'profile' });
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(await api.getProfile(tokens.accessToken)).toEqual({
      id: 'mock-user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });

    const refreshed = await provider.refreshToken(tokens.refreshToken!);
    expect(refreshed.accessToken).not.toBe(tokens.accessToken);
    expect(refreshed).toMatchObject({ refreshToken: undefined, expiresIn: 3600, scope: 'profile' });
    expect(await api.getProfile(refreshed.accessToken)).toMatchObject({ name: 'Ada Lovelace' });
  });

  it('accepts a code only once', async () => {
    const code = (await authorize(['profile'], 'state-2')).searchParams.get('code')!;
    await provider.exchangeCode(code);

    await expect(provider.exchangeCode(code)).rejects.toThrow('Mock token request failed: Unknown or expired code.');
  });

  it('rejects a refresh token it did not issue', async () => {
    await expect(provider.refreshToken('unknown')).rejects.toThrow('Mock token request failed: Unknown refresh token.');
  });

  it('answers the API with no profile for a token it did not issue', async () => {
    expect(await api.getProfile('unknown')).toBeUndefined();
  });

  it('refuses a scope it does not support', async () => {
    const response = await fetch(provider.buildAuthUrl(['admin'], 'state-3'));

    expect(response.status).toBe(400);
  });
});
