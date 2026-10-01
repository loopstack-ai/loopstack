import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitConfigUserTool } from '../git-config-user.tool.js';

describe('GitConfigUserTool', () => {
  let module: TestingModule;
  let tool: GitConfigUserTool;

  const mockRemoteClient = {
    gitConfigUser: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitConfigUserTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitConfigUserTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires name and email', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ name: 'Ada' })).toThrow();
      expect(() => schema.parse({ email: 'ada@example.com' })).toThrow();
      expect(() => schema.parse({ name: 'Ada', email: 'ada@example.com' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ name: 'Ada', email: 'ada@example.com', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('configures the git user through RemoteClient', async () => {
      mockRemoteClient.gitConfigUser.mockResolvedValue({ success: true });

      const result = await tool.call({ name: 'Ada', email: 'ada@example.com' });

      expect(mockRemoteClient.gitConfigUser).toHaveBeenCalledWith('https://agent.example', 'Ada', 'ada@example.com');
      expect(result.data).toEqual({ success: true });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitConfigUser.mockRejectedValue(new Error('could not lock config file'));

      await expect(tool.call({ name: 'Ada', email: 'ada@example.com' })).rejects.toThrow('could not lock config file');
    });
  });
});
