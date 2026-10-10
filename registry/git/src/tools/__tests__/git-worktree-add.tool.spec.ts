import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitWorktreeAddTool } from '../git-worktree-add.tool.js';

describe('GitWorktreeAddTool', () => {
  let module: TestingModule;
  let tool: GitWorktreeAddTool;

  const mockRemoteClient = {
    gitWorktreeAdd: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitWorktreeAddTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitWorktreeAddTool);
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

    it('accepts optional branch, newBranch and force', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ path: '../wt', branch: 'feature', newBranch: true, force: false })).not.toThrow();
      expect(() => schema.parse({ path: '../wt', newBranch: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ path: '../wt', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('passes the args through to RemoteClient', async () => {
      mockRemoteClient.gitWorktreeAdd.mockResolvedValue({ success: true, path: '/workspace/wt' });

      const result = await tool.call({ path: '../wt' });

      expect(mockRemoteClient.gitWorktreeAdd).toHaveBeenCalledWith('https://agent.example', { path: '../wt' });
      expect(result.data).toEqual({ success: true, path: '/workspace/wt' });
    });

    it('forwards branch, newBranch and force', async () => {
      mockRemoteClient.gitWorktreeAdd.mockResolvedValue({
        success: true,
        path: '/workspace/wt',
        output: "Preparing worktree (new branch 'feature')",
      });

      const result = await tool.call({ path: '../wt', branch: 'feature', newBranch: true, force: true });

      expect(mockRemoteClient.gitWorktreeAdd).toHaveBeenCalledWith('https://agent.example', {
        path: '../wt',
        branch: 'feature',
        newBranch: true,
        force: true,
      });
      expect(result.data).toEqual({
        success: true,
        path: '/workspace/wt',
        output: "Preparing worktree (new branch 'feature')",
      });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitWorktreeAdd.mockRejectedValue(new Error('already exists'));

      await expect(tool.call({ path: '../wt' })).rejects.toThrow('already exists');
    });
  });
});
