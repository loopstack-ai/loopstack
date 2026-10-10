import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitWorktreeRemoveTool } from '../git-worktree-remove.tool.js';

describe('GitWorktreeRemoveTool', () => {
  let module: TestingModule;
  let tool: GitWorktreeRemoveTool;

  const mockRemoteClient = {
    gitWorktreeRemove: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitWorktreeRemoveTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitWorktreeRemoveTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ path: '../wt' })).not.toThrow();
    });

    it('accepts an optional force flag', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ path: '../wt', force: true })).not.toThrow();
      expect(() => schema.parse({ path: '../wt', force: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ path: '../wt', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('removes the worktree through RemoteClient', async () => {
      mockRemoteClient.gitWorktreeRemove.mockResolvedValue({ success: true });

      const result = await tool.call({ path: '../wt' });

      expect(mockRemoteClient.gitWorktreeRemove).toHaveBeenCalledWith('https://agent.example', { path: '../wt' });
      expect(result.data).toEqual({ success: true });
    });

    it('forwards the force flag', async () => {
      mockRemoteClient.gitWorktreeRemove.mockResolvedValue({ success: true });

      await tool.call({ path: '../wt', force: true });

      expect(mockRemoteClient.gitWorktreeRemove).toHaveBeenCalledWith('https://agent.example', {
        path: '../wt',
        force: true,
      });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitWorktreeRemove.mockRejectedValue(new Error('contains modified or untracked files'));

      await expect(tool.call({ path: '../wt' })).rejects.toThrow('contains modified or untracked files');
    });
  });
});
