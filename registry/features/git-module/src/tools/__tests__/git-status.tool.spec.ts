import { TestingModule } from '@nestjs/testing';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitStatusTool } from '../git-status.tool';

describe('GitStatusTool', () => {
  let module: TestingModule;
  let tool: GitStatusTool;

  const mockRemoteClient = {
    gitStatus: jest.fn(),
  };
  const mockSandbox = {
    getAgentUrl: jest.fn().mockReturnValue('https://agent.example'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createToolTest()
      .forTool(GitStatusTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(SandboxEnvironmentService, mockSandbox)
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
