import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitRemoteConfigureTool } from '../git-remote-configure.tool.js';

describe('GitRemoteConfigureTool', () => {
  let module: TestingModule;
  let tool: GitRemoteConfigureTool;

  const mockRemoteClient = {
    gitConfigureRemote: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitRemoteConfigureTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitRemoteConfigureTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a url', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ url: 'https://github.com/octo/hello.git' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ url: 'https://github.com/octo/hello.git', name: 'upstream' })).toThrow();
    });
  });

  describe('execution', () => {
    it('configures the remote through RemoteClient', async () => {
      mockRemoteClient.gitConfigureRemote.mockResolvedValue({ success: true });

      const result = await tool.call({ url: 'https://github.com/octo/hello.git' });

      expect(mockRemoteClient.gitConfigureRemote).toHaveBeenCalledWith(
        'https://agent.example',
        'https://github.com/octo/hello.git',
      );
      expect(result.data).toEqual({ success: true });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitConfigureRemote.mockRejectedValue(new Error('not a git repository'));

      await expect(tool.call({ url: 'https://github.com/octo/hello.git' })).rejects.toThrow('not a git repository');
    });
  });
});
