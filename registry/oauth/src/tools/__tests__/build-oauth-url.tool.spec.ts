import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { OAuthProviderRegistry } from '../../services/index.js';
import { BuildOAuthUrlTool } from '../build-oauth-url.tool.js';

describe('BuildOAuthUrlTool', () => {
  let module: TestingModule;
  let tool: BuildOAuthUrlTool;

  const provider = {
    providerId: 'acme',
    defaultScopes: ['profile', 'email'],
    buildAuthUrl: vi.fn(
      (scopes: string[], state: string) => `https://acme.test/auth?scope=${scopes.join(' ')}&state=${state}`,
    ),
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(),
  };
  const mockRegistry = { get: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRegistry.get.mockReturnValue(provider);

    module = await createToolTest().forTool(BuildOAuthUrlTool).withMock(OAuthProviderRegistry, mockRegistry).compile();

    tool = module.get(BuildOAuthUrlTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires provider and scopes', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ provider: 'acme' })).toThrow();
      expect(() => schema.parse({ scopes: [] })).toThrow();
      expect(() => schema.parse({ provider: 'acme', scopes: ['a'] })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ provider: 'acme', scopes: [], extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('builds the auth URL with the requested scopes and a random hex state', async () => {
      const result = await tool.call({ provider: 'acme', scopes: ['repo'] });

      expect(mockRegistry.get).toHaveBeenCalledWith('acme');
      expect(result.data.state).toMatch(/^[0-9a-f]{64}$/);
      expect(provider.buildAuthUrl).toHaveBeenCalledWith(['repo'], result.data.state);
      expect(result.data.authUrl).toBe(`https://acme.test/auth?scope=repo&state=${result.data.state}`);
    });

    it('falls back to the provider default scopes when none are requested', async () => {
      const result = await tool.call({ provider: 'acme', scopes: [] });

      expect(provider.buildAuthUrl).toHaveBeenCalledWith(['profile', 'email'], result.data.state);
    });

    it('generates a fresh state per call', async () => {
      const first = await tool.call({ provider: 'acme', scopes: [] });
      const second = await tool.call({ provider: 'acme', scopes: [] });

      expect(first.data.state).not.toBe(second.data.state);
    });

    it('propagates an unknown-provider error from the registry', async () => {
      mockRegistry.get.mockImplementation(() => {
        throw new Error('OAuth provider "nope" is not registered.');
      });

      await expect(tool.call({ provider: 'nope', scopes: [] })).rejects.toThrow(
        'OAuth provider "nope" is not registered.',
      );
      expect(provider.buildAuthUrl).not.toHaveBeenCalled();
    });
  });
});
