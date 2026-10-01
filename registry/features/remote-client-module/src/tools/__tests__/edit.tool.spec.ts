import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { EnvironmentService } from '../../services/environment.service.js';
import { RemoteClient } from '../../services/remote-client.service.js';
import { EditTool } from '../edit.tool.js';

describe('EditTool', () => {
  let module: TestingModule;
  let tool: EditTool;

  const mockRemoteClient = {
    editFile: vi.fn(),
  };
  const mockEnv = {
    getAgentUrl: vi.fn().mockResolvedValue('https://agent.example'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(EditTool)
      .withMock(RemoteClient, mockRemoteClient)
      .withMock(EnvironmentService, mockEnv)
      .compile();

    tool = module.get(EditTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires file_path, old_string and new_string', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ file_path: 'a.ts', old_string: 'x' })).toThrow();
      expect(() => schema.parse({ file_path: 'a.ts', new_string: 'y' })).toThrow();
      expect(() => schema.parse({ old_string: 'x', new_string: 'y' })).toThrow();
      expect(() => schema.parse({ file_path: 'a.ts', old_string: 'x', new_string: 'y' })).not.toThrow();
    });

    it('accepts an optional replace_all flag', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() =>
        schema.parse({ file_path: 'a.ts', old_string: 'x', new_string: 'y', replace_all: true }),
      ).not.toThrow();
      expect(() => schema.parse({ file_path: 'a.ts', old_string: 'x', new_string: 'y', replace_all: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ file_path: 'a.ts', old_string: 'x', new_string: 'y', extra: 1 })).toThrow();
    });
  });

  describe('execution', () => {
    it('edits the file on the remote agent', async () => {
      mockRemoteClient.editFile.mockResolvedValue({ success: true, path: 'src/a.ts', replacements: 1 });

      const result = await tool.call({ file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' });

      expect(mockEnv.getAgentUrl).toHaveBeenCalled();
      expect(mockRemoteClient.editFile).toHaveBeenCalledWith(
        'https://agent.example',
        'src/a.ts',
        'foo',
        'bar',
        undefined,
      );
      expect(result.data).toEqual({ success: true, path: 'src/a.ts', replacements: 1 });
    });

    it('forwards replace_all', async () => {
      mockRemoteClient.editFile.mockResolvedValue({ success: true, path: 'src/a.ts', replacements: 3 });

      const result = await tool.call({
        file_path: 'src/a.ts',
        old_string: 'foo',
        new_string: 'bar',
        replace_all: true,
      });

      expect(mockRemoteClient.editFile).toHaveBeenCalledWith('https://agent.example', 'src/a.ts', 'foo', 'bar', true);
      expect(result.data).toEqual({ success: true, path: 'src/a.ts', replacements: 3 });
    });

    it('propagates RemoteClient failures', async () => {
      mockRemoteClient.editFile.mockRejectedValue(new Error('old_string is not unique'));

      await expect(tool.call({ file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' })).rejects.toThrow(
        'old_string is not unique',
      );
    });
  });
});
