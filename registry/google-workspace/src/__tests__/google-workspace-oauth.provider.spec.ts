import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderRegistry } from '@loopstack/oauth';
import { GoogleWorkspaceOAuthProvider } from '../google-workspace-oauth.provider.js';

describe('GoogleWorkspaceOAuthProvider', () => {
  let module: TestingModule;
  let provider: GoogleWorkspaceOAuthProvider;
  let config: Record<string, string | undefined>;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
  };
  const mockRegistry = {
    register: vi.fn(),
  };
  const fetchMock = vi.fn();

  const tokenRequest = () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init, params: Object.fromEntries(init.body as URLSearchParams) };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    config = {
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'https://app.example.com/oauth/callback',
    };

    module = await Test.createTestingModule({
      providers: [
        GoogleWorkspaceOAuthProvider,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OAuthProviderRegistry, useValue: mockRegistry },
      ],
    }).compile();

    provider = module.get(GoogleWorkspaceOAuthProvider);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  it('identifies as the google provider with userinfo default scopes', () => {
    expect(provider.providerId).toBe('google');
    expect(provider.defaultScopes).toEqual([
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]);
  });

  it('registers itself with the provider registry on module init', () => {
    provider.onModuleInit();

    expect(mockRegistry.register).toHaveBeenCalledWith(provider);
  });

  describe('buildAuthUrl', () => {
    it('builds an offline consent URL with the joined scopes and state', () => {
      const url = new URL(provider.buildAuthUrl(['openid', 'https://www.googleapis.com/auth/gmail.send'], 'state-1'));

      expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        client_id: 'client-id',
        redirect_uri: 'https://app.example.com/oauth/callback',
        response_type: 'code',
        scope: 'openid https://www.googleapis.com/auth/gmail.send',
        state: 'state-1',
        access_type: 'offline',
        prompt: 'consent',
      });
    });

    it('defaults the redirect URI to /oauth/callback', () => {
      config.GOOGLE_OAUTH_REDIRECT_URI = undefined;

      const url = new URL(provider.buildAuthUrl(['openid'], 's'));

      expect(url.searchParams.get('redirect_uri')).toBe('/oauth/callback');
    });

    it('throws when GOOGLE_CLIENT_ID is not configured', () => {
      config.GOOGLE_CLIENT_ID = undefined;

      expect(() => provider.buildAuthUrl(['openid'], 's')).toThrow('GOOGLE_CLIENT_ID is not configured');
    });
  });

  describe('exchangeCode', () => {
    it('posts the authorization code and maps the token response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 3599,
          token_type: 'Bearer',
          scope: 'openid email',
        }),
      );

      const result = await provider.exchangeCode('code-1');

      const { url, init, params } = tokenRequest();
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
      expect(params).toEqual({
        code: 'code-1',
        client_id: 'client-id',
        client_secret: 'client-secret',
        redirect_uri: 'https://app.example.com/oauth/callback',
        grant_type: 'authorization_code',
      });
      expect(result).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 3599,
        scope: 'openid email',
      });
    });

    it('throws with the status text when the exchange fails', async () => {
      fetchMock.mockResolvedValue(new Response('invalid_grant', { status: 400, statusText: 'Bad Request' }));

      await expect(provider.exchangeCode('code-1')).rejects.toThrow('Google token exchange failed: Bad Request');
    });

    it('throws without calling Google when GOOGLE_CLIENT_SECRET is not configured', async () => {
      config.GOOGLE_CLIENT_SECRET = undefined;

      await expect(provider.exchangeCode('code-1')).rejects.toThrow('GOOGLE_CLIENT_SECRET is not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('posts the refresh token and maps the token response', async () => {
      fetchMock.mockResolvedValue(Response.json({ access_token: 'access-2', expires_in: 3599, scope: 'openid' }));

      const result = await provider.refreshToken('refresh-1');

      const { url, init, params } = tokenRequest();
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
      expect(params).toEqual({
        refresh_token: 'refresh-1',
        client_id: 'client-id',
        client_secret: 'client-secret',
        grant_type: 'refresh_token',
      });
      expect(result).toEqual({ accessToken: 'access-2', expiresIn: 3599, scope: 'openid' });
    });

    it('returns a rotated refresh token from the refresh response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3599, scope: 'openid' }),
      );

      const result = await provider.refreshToken('refresh-1');

      expect(result).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3599, scope: 'openid' });
    });

    it('throws with the status and body when the refresh fails', async () => {
      fetchMock.mockResolvedValue(new Response('{"error":"invalid_grant"}', { status: 400 }));

      await expect(provider.refreshToken('refresh-1')).rejects.toThrow(
        'Google token refresh failed: 400 {"error":"invalid_grant"}',
      );
    });
  });
});
