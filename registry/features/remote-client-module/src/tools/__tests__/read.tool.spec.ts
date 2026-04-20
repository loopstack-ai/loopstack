import { TestingModule } from '@nestjs/testing';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { RemoteClient } from '../../services/remote-client.service';
import { SandboxEnvironmentService } from '../../services/sandbox-environment.service';
import { ReadTool } from '../read.tool';

describe('ReadTool', () => {
  let module: TestingModule;
  let tool: ReadTool;

  const mockRemoteClient = {
    readFile: jest.fn(),
  };
  const mockSandbox = {
    getAgentUrl: jest.fn().mockReturnValue('https://agent.example'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createToolTest()
      .forTool(ReadTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(SandboxEnvironmentService, mockSandbox)
      .compile();

    tool = module.get(ReadTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires file_path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
    });

    it('accepts optional offset and limit', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ file_path: 'README.md', offset: 10, limit: 20 })).not.toThrow();
    });
  });

  describe('execution', () => {
    it('reads the file from the remote agent', async () => {
      mockRemoteClient.readFile.mockResolvedValue({ content: 'hello' });

      const result = await tool.call({ file_path: 'README.md' });

      expect(mockRemoteClient.readFile).toHaveBeenCalledWith(
        'https://agent.example',
        'README.md',
        undefined,
        undefined,
      );
      expect(result.data).toEqual({ content: 'hello', path: 'README.md' });
    });

    it('forwards offset and limit when provided', async () => {
      mockRemoteClient.readFile.mockResolvedValue({ content: 'chunk' });

      await tool.call({ file_path: 'big.log', offset: 100, limit: 50 });

      expect(mockRemoteClient.readFile).toHaveBeenCalledWith('https://agent.example', 'big.log', 100, 50);
    });
  });
});
