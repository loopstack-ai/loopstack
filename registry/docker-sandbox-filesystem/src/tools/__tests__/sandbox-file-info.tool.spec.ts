import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/docker-sandbox';
import { createToolTest } from '@loopstack/testing';
import { SandboxFileInfo } from '../sandbox-file-info.tool.js';

describe('SandboxFileInfo', () => {
  let module: TestingModule;
  let tool: SandboxFileInfo;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stdout = '', stderr = '') => ({ data: { exitCode, stdout, stderr } });
  const mtime = '2026-01-02 10:00:00.000000000 +0000';
  const atime = '2026-01-03 11:00:00.000000000 +0000';
  const btime = '2026-01-01 09:00:00.000000000 +0000';

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest().forTool(SandboxFileInfo).withMock(SandboxCommand, mockSandboxCommand).compile();

    tool = module.get(SandboxFileInfo);
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

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs stat with the info format and maps the output', async () => {
      mockSandboxCommand.call.mockResolvedValue(
        commandResult(0, `regular file|1234|-rw-r--r--|node|staff|${mtime}|${atime}|${btime}\n`),
      );

      const result = await tool.call({ containerId: 'c1', path: '/app/src/main.ts' });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'stat',
        args: ['-c', '%F|%s|%A|%U|%G|%y|%x|%w', '/app/src/main.ts'],
        workingDirectory: '/',
        timeout: 10000,
      });
      expect(result.data).toEqual({
        path: '/app/src/main.ts',
        name: 'main.ts',
        type: 'file',
        size: 1234,
        permissions: '-rw-r--r--',
        owner: 'node',
        group: 'staff',
        modifiedAt: mtime,
        accessedAt: atime,
        createdAt: btime,
      });
    });

    it('uses the modification time as createdAt when the birth time is unknown', async () => {
      mockSandboxCommand.call.mockResolvedValue(
        commandResult(0, `directory|4096|drwxr-xr-x|root|root|${mtime}|${atime}|-`),
      );

      const result = await tool.call({ containerId: 'c1', path: '/app' });

      expect(result.data).toMatchObject({ name: 'app', type: 'directory', size: 4096, createdAt: mtime });
    });

    it.each([
      ['symbolic link', 'symlink'],
      ['character special file', 'other'],
    ])('maps stat type "%s" to %s', async (typeStr, type) => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, `${typeStr}|0|x|u|g|${mtime}|${atime}|${btime}`));

      const result = await tool.call({ containerId: 'c1', path: '/app/x' });

      expect(result.data.type).toBe(type);
    });

    it('throws on unexpected stat output', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, 'regular file|12\n'));

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Unexpected stat output format: regular file|12',
      );
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to get file info for /app/x: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, '', 'No such file or directory'));

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to get file info for /app/x: No such file or directory',
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to get file info for /app/x: Unknown error',
      );
    });
  });
});
