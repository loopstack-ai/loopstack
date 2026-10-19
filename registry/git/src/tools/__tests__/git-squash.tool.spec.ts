import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitSquashTool } from '../git-squash.tool.js';

const AGENT = 'https://agent.example';

/** A RemoteClient whose `executeCommand` answers by command prefix; every call is recorded. */
function fakeRemote(answers: Record<string, { exitCode: number; stdout?: string; stderr?: string }>) {
  const calls: { command: string; cwd?: string; timeout?: number }[] = [];
  return {
    calls,
    executeCommand: vi.fn(async (_url: string, command: string, cwd?: string, timeout?: number) => {
      calls.push({ command, cwd, timeout });
      const key = Object.keys(answers).find((prefix) => command.startsWith(prefix));
      const answer = key ? answers[key] : { exitCode: 0 };
      return { exitCode: answer.exitCode, stdout: answer.stdout ?? '', stderr: answer.stderr ?? '' };
    }),
  };
}

describe('GitSquashTool', () => {
  let module: TestingModule;
  let tool: GitSquashTool;
  let remote: ReturnType<typeof fakeRemote>;

  const mockEnv = { getAgentUrl: vi.fn().mockResolvedValue(AGENT) };

  async function build(answers: Record<string, { exitCode: number; stdout?: string; stderr?: string }>) {
    remote = fakeRemote(answers);
    module = await createToolTest()
      .forTool(GitSquashTool)
      .withMock(RemoteClient, remote)
      .withMock(EnvironmentService, mockEnv)
      .compile();
    tool = module.get(GitSquashTool);
  }

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    beforeEach(() => build({}));

    it('requires a baseRef and a message', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ baseRef: 'origin/main' })).toThrow();
      expect(() => schema.parse({ baseRef: 'origin/main', message: 'Add the thing' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ baseRef: 'origin/main', message: 'x', force: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('resets to the merge base and commits the message verbatim', async () => {
      await build({
        'git merge-base': { exitCode: 0, stdout: 'abc1234\n' },
        'git rev-list': { exitCode: 0, stdout: '3\n' },
      });

      const result = await tool.call({
        baseRef: 'origin/develop',
        message: 'Add the thing\n\nCloses #12\n',
        dir: 'loopstack',
      });

      expect(result.data).toEqual({ commits: 3, message: 'Add the thing\n\nCloses #12\n' });
      const commands = remote.calls.map((c) => c.command);
      expect(commands[0]).toBe('git merge-base origin/develop HEAD');
      expect(commands[1]).toBe('git rev-list --count abc1234..HEAD');
      expect(commands[2]).toBe('git reset -q --soft abc1234');
      expect(commands[3]).toBe(`git commit -q --allow-empty --cleanup=verbatim -m 'Add the thing\n\nCloses #12\n'`);
      expect(remote.calls.every((c) => c.cwd === 'loopstack')).toBe(true);
    });

    // The tree walk is the slow part, and the blocking exec route stops at 30 seconds by default.
    it('gives every command the long budget and the workspace root by default', async () => {
      await build({
        'git merge-base': { exitCode: 0, stdout: 'abc1234' },
        'git rev-list': { exitCode: 0, stdout: '1' },
      });

      await tool.call({ baseRef: 'origin/main', message: 'x' });

      expect(remote.calls.every((c) => c.timeout === 600_000)).toBe(true);
      expect(remote.calls.every((c) => c.cwd === '.')).toBe(true);
    });

    // A workflow that provisioned its own container holds its URL; no environment row points at it.
    it('runs on the agent the call names, without asking the environment', async () => {
      await build({
        'git merge-base': { exitCode: 0, stdout: 'abc1234' },
        'git rev-list': { exitCode: 0, stdout: '1' },
      });

      mockEnv.getAgentUrl.mockClear();

      await module
        .get<ToolPipeline>(TOOL_PIPELINE)
        .execute(tool, { baseRef: 'origin/main', message: 'x' }, { config: { agentUrl: 'https://landing.example' } });

      expect(mockEnv.getAgentUrl).not.toHaveBeenCalled();
      expect(remote.executeCommand.mock.calls.every((call) => call[0] === 'https://landing.example')).toBe(true);
    });

    it('turns the hooks off only when asked', async () => {
      await build({
        'git merge-base': { exitCode: 0, stdout: 'abc1234' },
        'git rev-list': { exitCode: 0, stdout: '1' },
      });

      await tool.call({ baseRef: 'origin/main', message: 'x', skipHooks: true });

      expect(remote.calls[3].command).toContain('git -c core.hooksPath=/dev/null commit');
    });

    it('throws with git’s output when a step fails, leaving the caller to decide', async () => {
      await build({ 'git merge-base': { exitCode: 128, stderr: 'fatal: Not a valid object name' } });

      await expect(tool.call({ baseRef: 'origin/main', message: 'x' })).rejects.toThrow('Not a valid object name');
    });

    it('refuses a ref that is not a ref', async () => {
      await build({});

      await expect(tool.call({ baseRef: '--upload-pack=sh', message: 'x' })).rejects.toThrow('not a usable git ref');
      expect(remote.calls).toHaveLength(0);
    });
  });
});
