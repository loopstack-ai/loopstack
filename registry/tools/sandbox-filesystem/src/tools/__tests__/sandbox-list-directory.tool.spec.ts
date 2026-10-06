import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';
import { createToolTest } from '@loopstack/testing';
import { SandboxListDirectory } from '../sandbox-list-directory.tool.js';

describe('SandboxListDirectory', () => {
  let module: TestingModule;
  let tool: SandboxListDirectory;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stdout = '', stderr = '') => ({ data: { exitCode, stdout, stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(SandboxListDirectory)
      .withMock(SandboxCommand, mockSandboxCommand)
      .compile();

    tool = module.get(SandboxListDirectory);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires containerId and path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1' })).toThrow();
      expect(() => schema.parse({ path: '/app' })).toThrow();
      expect(() => schema.parse({ containerId: 'c1', path: '/app' })).not.toThrow();
    });

    it('defaults recursive to false', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ containerId: 'c1', path: '/app' })).toEqual({
        containerId: 'c1',
        path: '/app',
        recursive: false,
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs find with maxdepth 1 and maps entries, skipping the directory itself', async () => {
      mockSandboxCommand.call.mockResolvedValue(
        commandResult(0, 'd 4096 /app\nf 120 /app/README.md\nd 4096 /app/src\nl 7 /app/link\np 0 /app/pipe\n'),
      );

      const result = await tool.call({ containerId: 'c1', path: '/app', recursive: false });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'sh',
        args: ['-c', "find '/app' -maxdepth 1 -printf '%y %s %p\\n'"],
        workingDirectory: '/',
        timeout: 30000,
      });
      expect(result.data).toEqual({
        path: '/app',
        entries: [
          { name: 'README.md', type: 'file', size: 120, path: '/app/README.md' },
          { name: 'src', type: 'directory', size: 4096, path: '/app/src' },
          { name: 'link', type: 'symlink', size: 7, path: '/app/link' },
          { name: 'pipe', type: 'other', size: 0, path: '/app/pipe' },
        ],
      });
    });

    it('omits maxdepth when recursive and keeps nested entries', async () => {
      mockSandboxCommand.call.mockResolvedValue(
        commandResult(0, 'd 4096 /app\nd 4096 /app/src\nf 42 /app/src/my file.ts\n'),
      );

      const result = await tool.call({ containerId: 'c1', path: '/app', recursive: true });

      expect(mockSandboxCommand.call.mock.calls[0][0].args).toEqual(['-c', "find '/app' -printf '%y %s %p\\n'"]);
      expect(result.data.entries).toEqual([
        { name: 'src', type: 'directory', size: 4096, path: '/app/src' },
        { name: 'my file.ts', type: 'file', size: 42, path: '/app/src/my file.ts' },
      ]);
    });

    it('escapes single quotes in the path', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, ''));

      await tool.call({ containerId: 'c1', path: "/app/it's", recursive: false });

      expect(mockSandboxCommand.call.mock.calls[0][0].args).toEqual([
        '-c',
        "find '/app/it'\\''s' -maxdepth 1 -printf '%y %s %p\\n'",
      ]);
    });

    it('ignores blank and malformed lines', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, '\n  \ngarbage\nf 1 /app/a\n'));

      const result = await tool.call({ containerId: 'c1', path: '/app', recursive: false });

      expect(result.data.entries).toEqual([{ name: 'a', type: 'file', size: 1, path: '/app/a' }]);
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: false })).rejects.toThrow(
        'Failed to list directory /app: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, '', "find: '/app': No such file or directory"));

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: false })).rejects.toThrow(
        "Failed to list directory /app: find: '/app': No such file or directory",
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: false })).rejects.toThrow(
        'Failed to list directory /app: Unknown error',
      );
    });
  });
});
