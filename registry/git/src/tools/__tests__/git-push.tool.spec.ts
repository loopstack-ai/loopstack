import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitTokenService } from '../../token/index.js';
import { GitPushTool } from '../git-push.tool.js';

describe('GitPushTool', () => {
  let module: TestingModule;
  let tool: GitPushTool;

  const mockRemoteClient = {
    gitPush: vi.fn(),
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
      .forTool(GitPushTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .withMock(GitTokenService, mockTokens)
      .compile();

    tool = module.get(GitPushTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts optional remote, branch and force', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ remote: 'origin', branch: 'main', force: true })).not.toThrow();
      expect(() => schema.parse({ force: 'yes' })).toThrow();
    });

    it('refuses a token as an argument', () => {
      // A credential is named in config and read at call time: an argument would be kept in the run trace.
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ token: 'ghp_x' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ tags: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('pushes with defaults', async () => {
      mockRemoteClient.gitPush.mockResolvedValue({ success: true });

      const result = await tool.call({});

      expect(mockRemoteClient.gitPush).toHaveBeenCalledWith('https://agent.example', {});
      expect(result.data).toEqual({ success: true });
    });

    it('forwards remote, branch and force, with the token from the named source', async () => {
      mockRemoteClient.gitPush.mockResolvedValue({ success: true, output: 'main -> main' });
      mockTokens.resolve.mockResolvedValue('ghp_x');

      const result = await tool.call({ remote: 'origin', branch: 'feature', force: true });

      expect(mockRemoteClient.gitPush).toHaveBeenCalledWith('https://agent.example', {
        remote: 'origin',
        branch: 'feature',
        force: true,
        token: 'ghp_x',
      });
      expect(result.data).toEqual({ success: true, output: 'main -> main' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitPush.mockRejectedValue(new Error('rejected: non-fast-forward'));

      await expect(tool.call({})).rejects.toThrow('rejected: non-fast-forward');
    });
  });
});
