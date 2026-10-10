import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderRegistry } from '@loopstack/oauth';
import { GitHubOAuthProvider } from '../github-oauth.provider.js';

describe('GitHubOAuthProvider', () => {
  let module: TestingModule;
  let provider: GitHubOAuthProvider;
  let config: Record<string, string | undefined>;

  const mockRegistry = {
    register: vi.fn(),
  };
  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
  const fetchMock = vi.fn();

  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    config = {
      GITHUB_CLIENT_ID: 'client-123',
      GITHUB_CLIENT_SECRET: 'secret-456',
      GITHUB_OAUTH_REDIRECT_URI: 'https://app.example.com/oauth/callback',
    };

    module = await Test.createTestingModule({
      providers: [
        GitHubOAuthProvider,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OAuthProviderRegistry, useValue: mockRegistry },
      ],
    }).compile();
    await module.init();

    provider = module.get(GitHubOAuthProvider);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  it('registers itself with the provider registry on init', () => {
    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    expect(mockRegistry.register).toHaveBeenCalledWith(provider);
  });

  it('exposes the github provider id and default scopes', () => {
    expect(provider.providerId).toBe('github');
    expect(provider.defaultScopes).toEqual(['repo', 'user', 'workflow', 'read:org']);
  });

  describe('buildAuthUrl', () => {
    it('builds the authorize URL from config, scopes and state', () => {
      const url = provider.buildAuthUrl(['repo', 'read:org'], 'state-abc');

      expect(url).toBe(
        'https://github.com/login/oauth/authorize?client_id=client-123&redirect_uri=https%3A%2F%2Fapp.example.com%2Foauth%2Fcallback&scope=repo+read%3Aorg&state=state-abc',
      );
    });

    it('falls back to the default redirect URI', () => {
      config.GITHUB_OAUTH_REDIRECT_URI = undefined;

      const url = new URL(provider.buildAuthUrl(['repo'], 'state-abc'));

      expect(url.searchParams.get('redirect_uri')).toBe('/oauth/callback');
    });

    it('throws when GITHUB_CLIENT_ID is not configured', () => {
      config.GITHUB_CLIENT_ID = undefined;

      expect(() => provider.buildAuthUrl(['repo'], 'state-abc')).toThrow('GITHUB_CLIENT_ID is not configured');
    });
  });

  describe('exchangeCode', () => {
    it('exchanges the code for a long-lived token', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ access_token: 'gho_token', token_type: 'bearer', scope: 'repo,read:org' }),
      );

      const tokens = await provider.exchangeCode('code-xyz');

      const [url, init] = request();
      expect(url).toBe('https://github.com/login/oauth/access_token');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      });
      expect(init.body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        code: 'code-xyz',
        client_id: 'client-123',
        client_secret: 'secret-456',
        redirect_uri: 'https://app.example.com/oauth/callback',
      });
      expect(tokens).toEqual({ accessToken: 'gho_token', expiresIn: 315360000, scope: 'repo,read:org' });
    });

    it('throws with the status text when the exchange fails', async () => {
      fetchMock.mockResolvedValue(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      await expect(provider.exchangeCode('code-xyz')).rejects.toThrow('GitHub token exchange failed: Bad Request');
    });

    it("throws with GitHub's error description when the exchange is rejected with HTTP 200", async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        }),
      );

      await expect(provider.exchangeCode('code-xyz')).rejects.toThrow(
        'GitHub token exchange failed: The code passed is incorrect or expired.',
      );
    });

    it('throws when the response carries no access token', async () => {
      fetchMock.mockResolvedValue(Response.json({}));

      await expect(provider.exchangeCode('code-xyz')).rejects.toThrow(
        'GitHub token exchange failed: no access token returned',
      );
    });

    it.each(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'])(
      'throws without calling GitHub when %s is not configured',
      async (key) => {
        config[key] = undefined;

        await expect(provider.exchangeCode('code-xyz')).rejects.toThrow(`${key} is not configured`);
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );
  });

  describe('refreshToken', () => {
    it('throws because GitHub tokens cannot be refreshed', () => {
      expect(() => provider.refreshToken()).toThrow('GitHub tokens do not expire and cannot be refreshed.');
    });
  });
});
