import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { ReadTool } from '../read.tool.js';

describe('ReadTool', () => {
  let module: TestingModule;
  let tool: ReadTool;

  const mockRemoteClient = {
    readFile: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(ReadTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
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
