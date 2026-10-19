import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitTokenService } from '../../token/index.js';
import { GitFetchTool } from '../git-fetch.tool.js';

describe('GitFetchTool', () => {
  let module: TestingModule;
  let tool: GitFetchTool;

  const mockRemoteClient = {
    gitFetch: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };
  const mockTokens = {
    resolve: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitFetchTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .withMock(GitTokenService, mockTokens)
      .compile();

    tool = module.get(GitFetchTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts an optional remote', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ remote: 'upstream' })).not.toThrow();
    });

    it('refuses a token as an argument', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ token: 'ghp_x' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ branch: 'main' })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches with defaults', async () => {
      mockRemoteClient.gitFetch.mockResolvedValue({ success: true });

      const result = await tool.call({});

      expect(mockRemoteClient.gitFetch).toHaveBeenCalledWith('https://agent.example', {});
      expect(result.data).toEqual({ success: true });
    });

    it('forwards the remote, with the token from the named source', async () => {
      mockRemoteClient.gitFetch.mockResolvedValue({ success: true, output: 'From github.com:octo/hello' });
      mockTokens.resolve.mockResolvedValue('ghp_x');

      const result = await tool.call({ remote: 'upstream' });

      expect(mockRemoteClient.gitFetch).toHaveBeenCalledWith('https://agent.example', {
        remote: 'upstream',
        token: 'ghp_x',
      });
      expect(result.data).toEqual({ success: true, output: 'From github.com:octo/hello' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitFetch.mockRejectedValue(new Error('Authentication failed'));

      await expect(tool.call({})).rejects.toThrow('Authentication failed');
    });
  });
});
