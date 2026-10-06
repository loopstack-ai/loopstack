import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';
import { createToolTest } from '@loopstack/testing';
import { SandboxCreateDirectory } from '../sandbox-create-directory.tool.js';

describe('SandboxCreateDirectory', () => {
  let module: TestingModule;
  let tool: SandboxCreateDirectory;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stderr = '') => ({ data: { exitCode, stdout: '', stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(SandboxCreateDirectory)
      .withMock(SandboxCommand, mockSandboxCommand)
      .compile();

    tool = module.get(SandboxCreateDirectory);
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

    it('defaults recursive to true', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ containerId: 'c1', path: '/app' })).toEqual({
        containerId: 'c1',
        path: '/app',
        recursive: true,
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs mkdir -p when recursive and reports the directory as created', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      const result = await tool.call({ containerId: 'c1', path: '/app/a/b', recursive: true });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'mkdir',
        args: ['-p', '/app/a/b'],
        workingDirectory: '/',
        timeout: 10000,
      });
      expect(result.data).toEqual({ path: '/app/a/b', created: true });
    });

    it('runs mkdir without -p when not recursive', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      await tool.call({ containerId: 'c1', path: '/app', recursive: false });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith(expect.objectContaining({ args: ['/app'] }));
    });

    it('reports created false when the directory already exists', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, "mkdir: cannot create directory '/app': File exists"));

      const result = await tool.call({ containerId: 'c1', path: '/app', recursive: false });

      expect(result.data).toEqual({ path: '/app', created: false });
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: true })).rejects.toThrow(
        'Failed to create directory /app: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, 'Permission denied'));

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: true })).rejects.toThrow(
        'Failed to create directory /app: Permission denied',
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(2));

      await expect(tool.call({ containerId: 'c1', path: '/app', recursive: true })).rejects.toThrow(
        'Failed to create directory /app: Unknown error',
      );
    });
  });
});
