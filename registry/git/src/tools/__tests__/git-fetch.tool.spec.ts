import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitFetchTool } from '../git-fetch.tool.js';

describe('GitFetchTool', () => {
  let module: TestingModule;
  let tool: GitFetchTool;

  const mockRemoteClient = {
    gitFetch: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitFetchTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitFetchTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('accepts optional remote and token', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ remote: 'upstream', token: 'ghp_x' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ branch: 'main' })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches with defaults', async () => {
      mockRemoteClient.gitFetch.mockResolvedValue({ success: true });

      const result = await tool.call({});

      expect(mockRemoteClient.gitFetch).toHaveBeenCalledWith('https://agent.example', undefined, undefined);
      expect(result.data).toEqual({ success: true });
    });

    it('forwards remote and token', async () => {
      mockRemoteClient.gitFetch.mockResolvedValue({ success: true, output: 'From github.com:octo/hello' });

      const result = await tool.call({ remote: 'upstream', token: 'ghp_x' });

      expect(mockRemoteClient.gitFetch).toHaveBeenCalledWith('https://agent.example', 'upstream', 'ghp_x');
      expect(result.data).toEqual({ success: true, output: 'From github.com:octo/hello' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.gitFetch.mockRejectedValue(new Error('Authentication failed'));

      await expect(tool.call({})).rejects.toThrow('Authentication failed');
    });
  });
});
