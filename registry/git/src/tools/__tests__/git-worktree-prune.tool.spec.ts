import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitWorktreePruneTool } from '../git-worktree-prune.tool.js';

describe('GitWorktreePruneTool', () => {
  let module: TestingModule;
  let tool: GitWorktreePruneTool;

  const mockRemoteClient = {
    gitWorktreePrune: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitWorktreePruneTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitWorktreePruneTool);
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
      expect(() => schema.parse({ dryRun: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('prunes worktrees through RemoteClient', async () => {
      mockRemoteClient.gitWorktreePrune.mockResolvedValue({ success: true, output: 'Removing worktrees/wt' });

      const result = await tool.call();

      expect(mockRemoteClient.gitWorktreePrune).toHaveBeenCalledWith('https://agent.example');
      expect(result.data).toEqual({ success: true, output: 'Removing worktrees/wt' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitWorktreePrune.mockRejectedValue(new Error('not a git repository'));

      await expect(tool.call()).rejects.toThrow('not a git repository');
    });
  });
});
