import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';
import { createToolTest } from '@loopstack/testing';
import { SandboxWriteFile } from '../sandbox-write-file.tool.js';

describe('SandboxWriteFile', () => {
  let module: TestingModule;
  let tool: SandboxWriteFile;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stderr = '') => ({ data: { exitCode, stdout: '', stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest().forTool(SandboxWriteFile).withMock(SandboxCommand, mockSandboxCommand).compile();

    tool = module.get(SandboxWriteFile);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires containerId, path and content', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt' })).toThrow();
      expect(() => schema.parse({ containerId: 'c1', content: 'x' })).toThrow();
      expect(() => schema.parse({ path: '/app/a.txt', content: 'x' })).toThrow();
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt', content: 'x' })).not.toThrow();
    });

    it('defaults encoding to utf8 and createParentDirs to true', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ containerId: 'c1', path: '/app/a.txt', content: 'x' })).toEqual({
        containerId: 'c1',
        path: '/app/a.txt',
        content: 'x',
        encoding: 'utf8',
        createParentDirs: true,
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app/a.txt', content: 'x', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('creates the parent directory, then writes base64-encoded utf8 content', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));
      const content = "héllo 'world'\n$(rm -rf /)";
      const base64 = Buffer.from(content, 'utf8').toString('base64');

      const result = await tool.call({
        containerId: 'c1',
        path: '/app/src/a.txt',
        content,
        encoding: 'utf8',
        createParentDirs: true,
      });

      expect(mockSandboxCommand.call).toHaveBeenCalledTimes(2);
      expect(mockSandboxCommand.call).toHaveBeenNthCalledWith(1, {
        containerId: 'c1',
        executable: 'mkdir',
        args: ['-p', '/app/src'],
        workingDirectory: '/',
        timeout: 5000,
      });
      expect(mockSandboxCommand.call).toHaveBeenNthCalledWith(2, {
        containerId: 'c1',
        executable: 'sh',
        args: ['-c', `echo '${base64}' | base64 -d > '/app/src/a.txt'`],
        workingDirectory: '/',
        timeout: 30000,
      });
      expect(result.data).toEqual({ path: '/app/src/a.txt', bytesWritten: Buffer.byteLength(content, 'utf8') });
    });

    it('escapes single quotes in the target path', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      await tool.call({
        containerId: 'c1',
        path: "/app/it's.txt",
        content: 'hi',
        encoding: 'utf8',
        createParentDirs: true,
      });

      expect(mockSandboxCommand.call.mock.calls[1][0].args).toEqual([
        '-c',
        "echo 'aGk=' | base64 -d > '/app/it'\\''s.txt'",
      ]);
    });

    it('strips non-base64 characters from base64 content and counts decoded bytes', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      const result = await tool.call({
        containerId: 'c1',
        path: '/app/a.bin',
        content: "aGVs\nbG8=' ; rm -rf /",
        encoding: 'base64',
        createParentDirs: false,
      });

      expect(mockSandboxCommand.call).toHaveBeenCalledTimes(1);
      expect(mockSandboxCommand.call.mock.calls[0][0].args).toEqual([
        '-c',
        "echo 'aGVsbG8=rmrf/' | base64 -d > '/app/a.bin'",
      ]);
      expect(result.data).toEqual({ path: '/app/a.bin', bytesWritten: 5 });
    });

    it.each(['/a.txt', 'a.txt'])('skips mkdir when the parent of %s is root or cwd', async (path) => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      await tool.call({ containerId: 'c1', path, content: 'x', encoding: 'utf8', createParentDirs: true });

      expect(mockSandboxCommand.call).toHaveBeenCalledTimes(1);
      expect(mockSandboxCommand.call).toHaveBeenCalledWith(expect.objectContaining({ executable: 'sh' }));
    });

    it('throws when mkdir returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValueOnce({});

      await expect(
        tool.call({
          containerId: 'c1',
          path: '/app/src/a.txt',
          content: 'x',
          encoding: 'utf8',
          createParentDirs: true,
        }),
      ).rejects.toThrow('Failed to create parent directory /app/src: No result data');
      expect(mockSandboxCommand.call).toHaveBeenCalledTimes(1);
    });

    it('throws with stderr when mkdir fails', async () => {
      mockSandboxCommand.call.mockResolvedValueOnce(commandResult(1, 'Permission denied'));

      await expect(
        tool.call({
          containerId: 'c1',
          path: '/app/src/a.txt',
          content: 'x',
          encoding: 'utf8',
          createParentDirs: true,
        }),
      ).rejects.toThrow('Failed to create parent directory /app/src: Permission denied');
      expect(mockSandboxCommand.call).toHaveBeenCalledTimes(1);
    });

    it('falls back to "Unknown error" when mkdir fails without stderr', async () => {
      mockSandboxCommand.call.mockResolvedValueOnce(commandResult(1));

      await expect(
        tool.call({
          containerId: 'c1',
          path: '/app/src/a.txt',
          content: 'x',
          encoding: 'utf8',
          createParentDirs: true,
        }),
      ).rejects.toThrow('Failed to create parent directory /app/src: Unknown error');
    });

    it('throws when the write returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(
        tool.call({ containerId: 'c1', path: '/app/a.txt', content: 'x', encoding: 'utf8', createParentDirs: false }),
      ).rejects.toThrow('Failed to write file /app/a.txt: No result data');
    });

    it('throws with stderr when the write fails', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, 'Read-only file system'));

      await expect(
        tool.call({ containerId: 'c1', path: '/app/a.txt', content: 'x', encoding: 'utf8', createParentDirs: false }),
      ).rejects.toThrow('Failed to write file /app/a.txt: Read-only file system');
    });

    it('falls back to "Unknown error" when the write fails without stderr', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(
        tool.call({ containerId: 'c1', path: '/app/a.txt', content: 'x', encoding: 'utf8', createParentDirs: false }),
      ).rejects.toThrow('Failed to write file /app/a.txt: Unknown error');
    });
  });
});
