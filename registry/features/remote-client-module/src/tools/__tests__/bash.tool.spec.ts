import { TestingModule } from '@nestjs/testing';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { RemoteClient } from '../../services/remote-client.service';
import { SandboxEnvironmentService } from '../../services/sandbox-environment.service';
import { BashTool } from '../bash.tool';

describe('BashTool', () => {
  let module: TestingModule;
  let tool: BashTool;

  const mockRemoteClient = {
    executeCommand: jest.fn(),
  };
  const mockSandbox = {
    getAgentUrl: jest.fn().mockReturnValue('https://agent.example'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createToolTest()
      .forTool(BashTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(SandboxEnvironmentService, mockSandbox)
      .compile();

    tool = module.get(BashTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a command', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
    });

    it('accepts an optional timeout', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ command: 'ls', timeout: 5000 })).not.toThrow();
    });

    it('rejects extra properties', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ command: 'ls', extra: 'nope' })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs the command on the remote agent and returns stdout/stderr/exitCode', async () => {
      mockRemoteClient.executeCommand.mockResolvedValue({ stdout: 'hi\n', stderr: '', exitCode: 0 });

      const result = await tool.call({ command: 'echo hi' });

      expect(mockRemoteClient.executeCommand).toHaveBeenCalledWith(
        'https://agent.example',
        'echo hi',
        undefined,
        undefined,
      );
      expect(result.data).toEqual({ stdout: 'hi\n', stderr: '', exitCode: 0 });
    });

    it('passes the timeout through to RemoteClient', async () => {
      mockRemoteClient.executeCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      await tool.call({ command: 'sleep 1', timeout: 500 });

      expect(mockRemoteClient.executeCommand).toHaveBeenCalledWith('https://agent.example', 'sleep 1', undefined, 500);
    });
  });
});
