import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';
import { createToolTest } from '@loopstack/testing';
import { SandboxDelete } from '../sandbox-delete.tool.js';

describe('SandboxDelete', () => {
  let module: TestingModule;
  let tool: SandboxDelete;

  const mockSandboxCommand = {
    call: vi.fn(),
  };

  const commandResult = (exitCode: number, stderr = '') => ({ data: { exitCode, stdout: '', stderr } });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest().forTool(SandboxDelete).withMock(SandboxCommand, mockSandboxCommand).compile();

    tool = module.get(SandboxDelete);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires containerId and path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1' })).toThrow();
      expect(() => schema.parse({ path: '/app/x' })).toThrow();
      expect(() => schema.parse({ containerId: 'c1', path: '/app/x' })).not.toThrow();
    });

    it('defaults recursive and force to false', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ containerId: 'c1', path: '/app/x' })).toEqual({
        containerId: 'c1',
        path: '/app/x',
        recursive: false,
        force: false,
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ containerId: 'c1', path: '/app/x', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('runs rm with only the path by default and reports the deletion', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      const result = await tool.call({ containerId: 'c1', path: '/app/x', recursive: false, force: false });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith({
        containerId: 'c1',
        executable: 'rm',
        args: ['/app/x'],
        workingDirectory: '/',
        timeout: 30000,
      });
      expect(result.data).toEqual({ path: '/app/x', deleted: true });
    });

    it.each([
      [true, false, ['-r', '/app/x']],
      [false, true, ['-f', '/app/x']],
      [true, true, ['-r', '-f', '/app/x']],
    ])('maps recursive=%s force=%s to rm args %j', async (recursive, force, args) => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      await tool.call({ containerId: 'c1', path: '/app/x', recursive, force });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith(expect.objectContaining({ args }));
    });

    it('passes a path with shell metacharacters as a single argument', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(0));

      await tool.call({ containerId: 'c1', path: "/app/it's; rm -rf /", recursive: false, force: false });

      expect(mockSandboxCommand.call).toHaveBeenCalledWith(
        expect.objectContaining({ executable: 'rm', args: ["/app/it's; rm -rf /"] }),
      );
    });

    it('throws when the command returns no data', async () => {
      mockSandboxCommand.call.mockResolvedValue({});

      await expect(tool.call({ containerId: 'c1', path: '/app/x', recursive: false, force: false })).rejects.toThrow(
        'Failed to delete /app/x: No result data',
      );
    });

    it('throws with stderr on a non-zero exit code', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1, 'No such file or directory'));

      await expect(tool.call({ containerId: 'c1', path: '/app/x', recursive: false, force: false })).rejects.toThrow(
        'Failed to delete /app/x: No such file or directory',
      );
    });

    it('falls back to "Unknown error" when stderr is empty', async () => {
      mockSandboxCommand.call.mockResolvedValue(commandResult(1));

      await expect(tool.call({ containerId: 'c1', path: '/app/x', recursive: false, force: false })).rejects.toThrow(
        'Failed to delete /app/x: Unknown error',
      );
    });
  });
});
