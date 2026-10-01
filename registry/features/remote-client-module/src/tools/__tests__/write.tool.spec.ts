import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { WriteTool } from '../write.tool.js';

describe('WriteTool', () => {
  let module: TestingModule;
  let tool: WriteTool;

  const mockRemoteClient = {
    writeFile: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(WriteTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(WriteTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires file_path and content', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ file_path: 'a.txt' })).toThrow();
      expect(() => schema.parse({ content: 'hi' })).toThrow();
      expect(() => schema.parse({ file_path: 'a.txt', content: '' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ file_path: 'a.txt', content: 'hi', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('writes the file and reports its path', async () => {
      mockRemoteClient.writeFile.mockResolvedValue({ ignored: true });

      const result = await tool.call({ file_path: 'src/new.ts', content: 'export {};\n' });

      expect(mockRemoteClient.writeFile).toHaveBeenCalledWith('https://agent.example', 'src/new.ts', 'export {};\n');
      expect(result.data).toEqual({ success: true, path: 'src/new.ts' });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.writeFile.mockRejectedValue(new Error('EACCES'));

      await expect(tool.call({ file_path: 'src/new.ts', content: 'x' })).rejects.toThrow('EACCES');
    });
  });
});
