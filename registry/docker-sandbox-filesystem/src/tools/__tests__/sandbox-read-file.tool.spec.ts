import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/docker-sandbox';
import { createToolTest } from '@loopstack/testing';
import { SandboxReadFile } from '../sandbox-read-file.tool.js';

describe('SandboxReadFile', () => {
  let module: TestingModule;
  let tool: SandboxReadFile;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stdout = '', stderr = '') => ({ data: { exitCode, stdout, stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest().forTool(SandboxReadFile).withMock(SandboxCommand, mockSandboxCommand).compile();

    tool = module.get(SandboxReadFile);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires containerId and path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1' })).toThrow();
      expect(() => schema.parse({ path: '/app/a.txt' })).toThrow();
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt' })).not.toThrow();
    });

    it('defaults encoding to utf8 and rejects unknown encodings', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ containerId: 'c1', path: '/app/a.txt' })).toEqual({
        containerId: 'c1',
        path: '/app/a.txt',
        encoding: 'utf8',
      });
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt', encoding: 'hex' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('reads utf8 files with cat and returns stdout verbatim', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, '  hello\nworld\n'));

      const result = await tool.call({ containerId: 'c1', path: '/app/a.txt', encoding: 'utf8' });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'cat',
        args: ['/app/a.txt'],
        workingDirectory: '/',
        timeout: 30000,
      });
      expect(result.data).toEqual({ content: '  hello\nworld\n', encoding: 'utf8' });
    });

    it('reads base64 files with the base64 executable', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, 'aGVsbG8=\n'));

      const result = await tool.call({ containerId: 'c1', path: '/app/a.bin', encoding: 'base64' });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith(
        expect.objectContaining({ executable: 'base64', args: ['/app/a.bin'] }),
      );
      expect(result.data).toEqual({ content: 'aGVsbG8=\n', encoding: 'base64' });
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app/a.txt', encoding: 'utf8' })).rejects.toThrow(
        'Failed to read file /app/a.txt: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, '', 'cat: /app/a.txt: No such file or directory'));

      await expect(tool.call({ containerId: 'c1', path: '/app/a.txt', encoding: 'utf8' })).rejects.toThrow(
        'Failed to read file /app/a.txt: cat: /app/a.txt: No such file or directory',
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(tool.call({ containerId: 'c1', path: '/app/a.txt', encoding: 'utf8' })).rejects.toThrow(
        'Failed to read file /app/a.txt: Unknown error',
      );
    });
  });
});
