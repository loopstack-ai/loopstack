import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitStatusTool } from '../git-status.tool.js';

describe('GitStatusTool', () => {
  let module: TestingModule;
  let tool: GitStatusTool;

  const mockRemoteClient = {
    gitStatus: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(GitStatusTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(GitStatusTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('returns whatever RemoteClient.gitStatus yields', async () => {
    const status = { branch: 'main', staged: [], modified: ['README.md'], untracked: [], deleted: [] };
    mockRemoteClient.gitStatus.mockResolvedValue(status);

    const result = await tool.call();

    expect(mockRemoteClient.gitStatus).toHaveBeenCalledWith('https://agent.example');
    expect(result.data).toEqual(status);
  });
});
