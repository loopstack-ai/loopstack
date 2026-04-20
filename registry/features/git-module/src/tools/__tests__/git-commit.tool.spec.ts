import { TestingModule } from '@nestjs/testing';
import { getBlockArgsSchema } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitCommitTool } from '../git-commit.tool';

describe('GitCommitTool', () => {
  let module: TestingModule;
  let tool: GitCommitTool;

  const mockRemoteClient = {
    gitCommit: jest.fn(),
  };
  const mockSandbox = {
    getAgentUrl: jest.fn().mockReturnValue('https://agent.example'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createToolTest()
      .forTool(GitCommitTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(SandboxEnvironmentService, mockSandbox)
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

      expect(mockSandbox.getAgentUrl).toHaveBeenCalled();
      expect(mockRemoteClient.gitCommit).toHaveBeenCalledWith('https://agent.example', 'update from workflow');
      expect(result.data).toEqual({ hash: 'abc123' });
    });
  });
});
