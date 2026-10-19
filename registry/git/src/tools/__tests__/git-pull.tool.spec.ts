import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitTokenService } from '../../token/index.js';
import { GitPullTool } from '../git-pull.tool.js';

describe('GitPullTool', () => {
  let module: TestingModule;
  let tool: GitPullTool;

  const mockRemoteClient = {
    gitPull: vi.fn(),
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
      .forTool(GitPullTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .withMock(GitTokenService, mockTokens)
      .compile();

    tool = module.get(GitPullTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts optional remote and branch', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ remote: 'origin', branch: 'main' })).not.toThrow();
    });

    it('refuses a token as an argument', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ token: 'ghp_x' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ force: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('pulls with defaults', async () => {
      mockRemoteClient.gitPull.mockResolvedValue({ success: true });

      const result = await tool.call({});

      expect(mockRemoteClient.gitPull).toHaveBeenCalledWith('https://agent.example', {});
      expect(result.data).toEqual({ success: true });
    });

    it('forwards remote and branch, with the token from the named source', async () => {
      mockRemoteClient.gitPull.mockResolvedValue({ success: true, output: 'Already up to date.' });
      mockTokens.resolve.mockResolvedValue('ghp_x');

      const result = await tool.call({ remote: 'upstream', branch: 'main' });

      expect(mockRemoteClient.gitPull).toHaveBeenCalledWith('https://agent.example', {
        remote: 'upstream',
        branch: 'main',
        token: 'ghp_x',
      });
      expect(result.data).toEqual({ success: true, output: 'Already up to date.' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitPull.mockRejectedValue(new Error('merge conflict'));

      await expect(tool.call({})).rejects.toThrow('merge conflict');
    });
  });
});
