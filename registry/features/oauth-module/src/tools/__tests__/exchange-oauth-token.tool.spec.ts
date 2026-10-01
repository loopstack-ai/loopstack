import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { OAuthProviderRegistry, OAuthTokenStore } from '../../services/index.js';
import { ExchangeOAuthTokenTool } from '../exchange-oauth-token.tool.js';

describe('ExchangeOAuthTokenTool', () => {
  let module: TestingModule;
  let tool: ExchangeOAuthTokenTool;

  const provider = {
    providerId: 'acme',
    defaultScopes: [],
    buildAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(),
  };
  const mockRegistry = { get: vi.fn() };
  const mockTokenStore = { storeFromTokenSet: vi.fn() };

  const tokenSet = { accessToken: 'at-1', refreshToken: 'rt-1', expiresIn: 3600, scope: 'profile email' };
  const args = { provider: 'acme', code: 'auth-code', state: 'state-1', expectedState: 'state-1' };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRegistry.get.mockReturnValue(provider);
    provider.exchangeCode.mockResolvedValue(tokenSet);
    mockTokenStore.storeFromTokenSet.mockResolvedValue(undefined);

    module = await createToolTest()
      .forTool(ExchangeOAuthTokenTool)
      .withMock(OAuthProviderRegistry, mockRegistry)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(ExchangeOAuthTokenTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires provider, code, state and expectedState', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ provider: 'acme', code: 'c', state: 's' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('exchanges the code, stores the tokens for the user and returns them', async () => {
      const result = await tool.call(args);

      expect(mockRegistry.get).toHaveBeenCalledWith('acme');
      expect(provider.exchangeCode).toHaveBeenCalledWith('auth-code');
      expect(mockTokenStore.storeFromTokenSet).toHaveBeenCalledWith('test-user', 'acme', tokenSet);
      expect(result.data).toEqual({
        accessToken: 'at-1',
        refreshToken: 'rt-1',
        expiresIn: 3600,
        scope: 'profile email',
      });
    });

    it('rejects a state mismatch without exchanging the code', async () => {
      await expect(tool.call({ ...args, state: 'forged' })).rejects.toThrow(
        'OAuth state mismatch. Possible CSRF attack.',
      );
      expect(mockRegistry.get).not.toHaveBeenCalled();
      expect(provider.exchangeCode).not.toHaveBeenCalled();
      expect(mockTokenStore.storeFromTokenSet).not.toHaveBeenCalled();
    });

    it('does not store anything when the provider exchange fails', async () => {
      provider.exchangeCode.mockRejectedValue(new Error('invalid_grant'));

      await expect(tool.call(args)).rejects.toThrow('invalid_grant');
      expect(mockTokenStore.storeFromTokenSet).not.toHaveBeenCalled();
    });

    it('propagates an unknown-provider error from the registry', async () => {
      mockRegistry.get.mockImplementation(() => {
        throw new Error('OAuth provider "acme" is not registered.');
      });

      await expect(tool.call(args)).rejects.toThrow('OAuth provider "acme" is not registered.');
    });
  });
});
