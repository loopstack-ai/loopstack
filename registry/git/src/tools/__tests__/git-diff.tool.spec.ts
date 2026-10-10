import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitDiffTool } from '../git-diff.tool.js';

describe('GitDiffTool', () => {
  let module: TestingModule;
  let tool: GitDiffTool;

  const mockRemoteClient = {
    gitDiff: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitDiffTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitDiffTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts an optional staged flag', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ staged: true })).not.toThrow();
      expect(() => schema.parse({ staged: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('returns the unstaged diff by default', async () => {
      const diff = { files: [{ path: 'README.md', status: 'M' }] };
      mockRemoteClient.gitDiff.mockResolvedValue(diff);

      const result = await tool.call({});

      expect(mockRemoteClient.gitDiff).toHaveBeenCalledWith('https://agent.example', undefined);
      expect(result.data).toEqual(diff);
    });

    it('forwards the staged flag', async () => {
      mockRemoteClient.gitDiff.mockResolvedValue({ files: [] });

      await tool.call({ staged: true });

      expect(mockRemoteClient.gitDiff).toHaveBeenCalledWith('https://agent.example', true);
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitDiff.mockRejectedValue(new Error('not a git repository'));

      await expect(tool.call({})).rejects.toThrow('not a git repository');
    });
  });
});
