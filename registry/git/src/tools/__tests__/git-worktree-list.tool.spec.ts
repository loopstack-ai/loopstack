import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitWorktreeListTool } from '../git-worktree-list.tool.js';

describe('GitWorktreeListTool', () => {
  let module: TestingModule;
  let tool: GitWorktreeListTool;

  const mockRemoteClient = {
    gitWorktreeList: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitWorktreeListTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitWorktreeListTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts no arguments', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ porcelain: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists the worktrees through RemoteClient', async () => {
      const worktrees = {
        worktrees: [
          { path: '/workspace', head: 'abc123', branch: 'refs/heads/main', bare: false, detached: false },
          { path: '/workspace-wt', head: 'def456', bare: false, detached: true, prunable: 'gitdir file missing' },
        ],
      };
      mockRemoteClient.gitWorktreeList.mockResolvedValue(worktrees);

      const result = await tool.call();

      expect(mockRemoteClient.gitWorktreeList).toHaveBeenCalledWith('https://agent.example');
      expect(result.data).toEqual(worktrees);
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitWorktreeList.mockRejectedValue(new Error('not a git repository'));

      await expect(tool.call()).rejects.toThrow('not a git repository');
    });
  });
});
