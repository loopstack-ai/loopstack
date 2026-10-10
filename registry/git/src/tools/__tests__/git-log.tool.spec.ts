import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitLogTool } from '../git-log.tool.js';

describe('GitLogTool', () => {
  let module: TestingModule;
  let tool: GitLogTool;

  const mockRemoteClient = {
    gitLog: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitLogTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitLogTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('defaults limit to 20', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({})).toEqual({ limit: 20 });
      expect(() => schema.parse({ limit: '5' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ limit: 5, extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('forwards the schema default limit', async () => {
      const log = {
        commits: [
          { hash: 'abc123def', shortHash: 'abc123d', message: 'init', author: 'Ada', date: '2026-01-01T00:00:00Z' },
        ],
      };
      mockRemoteClient.gitLog.mockResolvedValue(log);

      const result = await tool.call(getBlockArgsSchema(tool)!.parse({}) as { limit: number });

      expect(mockRemoteClient.gitLog).toHaveBeenCalledWith('https://agent.example', 20);
      expect(result.data).toEqual(log);
    });

    it('forwards an explicit limit', async () => {
      mockRemoteClient.gitLog.mockResolvedValue({ commits: [] });

      await tool.call({ limit: 5 });

      expect(mockRemoteClient.gitLog).toHaveBeenCalledWith('https://agent.example', 5);
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitLog.mockRejectedValue(new Error('does not have any commits yet'));

      await expect(tool.call({})).rejects.toThrow('does not have any commits yet');
    });
  });
});
