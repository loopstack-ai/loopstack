import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitAddTool } from '../git-add.tool.js';

describe('GitAddTool', () => {
  let module: TestingModule;
  let tool: GitAddTool;

  const mockRemoteClient = {
    gitAdd: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitAddTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitAddTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires files', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ files: 'README.md' })).toThrow();
      expect(() => schema.parse({ files: ['.'] })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ files: ['.'], extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('stages the files through RemoteClient', async () => {
      mockRemoteClient.gitAdd.mockResolvedValue({ success: true });

      const result = await tool.call({ files: ['src/a.ts', 'src/b.ts'] });

      expect(mockEnv.getAgentUrl).toHaveBeenCalled();
      expect(mockRemoteClient.gitAdd).toHaveBeenCalledWith('https://agent.example', ['src/a.ts', 'src/b.ts']);
      expect(result.data).toEqual({ success: true });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitAdd.mockRejectedValue(new Error('pathspec did not match'));

      await expect(tool.call({ files: ['missing'] })).rejects.toThrow('pathspec did not match');
    });
  });
});
