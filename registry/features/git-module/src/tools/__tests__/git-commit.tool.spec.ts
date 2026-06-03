import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitCommitTool } from '../git-commit.tool.js';

describe('GitCommitTool', () => {
  let module: TestingModule;
  let tool: GitCommitTool;

  const mockRemoteClient = {
    gitCommit: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitCommitTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitCommitTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('is defined with an args schema', () => {
      expect(tool).toBeDefined();
      expect(getBlockArgsSchema(tool)).toBeDefined();
    });
  });

  describe('validation', () => {
    it('requires a message', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ message: 'ok', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('forwards the commit through RemoteClient', async () => {
      mockRemoteClient.gitCommit.mockResolvedValue({ hash: 'abc123' });

      const result = await tool.call({ message: 'update from workflow' });

      expect(mockEnv.getAgentUrl).toHaveBeenCalled();
      expect(mockRemoteClient.gitCommit).toHaveBeenCalledWith('https://agent.example', 'update from workflow');
      expect(result.data).toEqual({ hash: 'abc123' });
    });
  });
});
