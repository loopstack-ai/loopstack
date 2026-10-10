import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitBranchTool } from '../git-branch.tool.js';

describe('GitBranchTool', () => {
  let module: TestingModule;
  let tool: GitBranchTool;

  const mockRemoteClient = {
    gitBranches: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitBranchTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitBranchTool);
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
      expect(() => schema.parse({ all: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists the branches through RemoteClient', async () => {
      const branches = {
        current: 'main',
        branches: [
          { name: 'main', isCurrent: true },
          { name: 'feature', isCurrent: false },
        ],
      };
      mockRemoteClient.gitBranches.mockResolvedValue(branches);

      const result = await tool.call();

      expect(mockRemoteClient.gitBranches).toHaveBeenCalledWith('https://agent.example');
      expect(result.data).toEqual(branches);
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitBranches.mockRejectedValue(new Error('not a git repository'));

      await expect(tool.call()).rejects.toThrow('not a git repository');
    });
  });
});
