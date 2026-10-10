import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/docker-sandbox';
import { createToolTest } from '@loopstack/testing';
import { SandboxExists } from '../sandbox-exists.tool.js';

describe('SandboxExists', () => {
  let module: TestingModule;
  let tool: SandboxExists;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stdout = '', stderr = '') => ({ data: { exitCode, stdout, stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest().forTool(SandboxExists).withMock(SandboxCommand, mockSandboxCommand).compile();

    tool = module.get(SandboxExists);
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
    it('runs a test/stat shell script for the path', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, 'regular file\n'));

      await tool.call({ containerId: 'c1', path: '/app/a.txt' });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'sh',
        args: ['-c', "if [ -e '/app/a.txt' ]; then stat -c '%F' '/app/a.txt'; else echo 'NOT_FOUND'; fi"],
        workingDirectory: '/',
        timeout: 10000,
      });
    });

    it('escapes single quotes in the path', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, 'NOT_FOUND\n'));

      await tool.call({ containerId: 'c1', path: "/app/it's" });

      expect(mockSandboxCommand.call.mock.calls[0][0].args).toEqual([
        '-c',
        "if [ -e '/app/it'\\''s' ]; then stat -c '%F' '/app/it'\\''s'; else echo 'NOT_FOUND'; fi",
      ]);
    });

    it.each([
      ['regular file', 'file'],
      ['regular empty file', 'file'],
      ['directory', 'directory'],
      ['symbolic link', 'symlink'],
      ['fifo', 'other'],
    ])('maps stat output "%s" to type %s', async (stdout, type) => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, `${stdout}\n`));

      const result = await tool.call({ containerId: 'c1', path: '/app/x' });

      expect(result.data).toEqual({ path: '/app/x', exists: true, type });
    });

    it('reports a missing path with type null', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0, 'NOT_FOUND\n'));

      const result = await tool.call({ containerId: 'c1', path: '/app/x' });

      expect(result.data).toEqual({ path: '/app/x', exists: false, type: null });
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to check existence of /app/x: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, '', 'stat failed'));

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to check existence of /app/x: stat failed',
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(tool.call({ containerId: 'c1', path: '/app/x' })).rejects.toThrow(
        'Failed to check existence of /app/x: Unknown error',
      );
    });
  });
});
