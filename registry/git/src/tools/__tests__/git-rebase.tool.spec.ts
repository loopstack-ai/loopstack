import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { type GitRebaseArgs, GitRebaseTool } from '../git-rebase.tool.js';

const AGENT = 'https://agent.example';

function fakeRemote(answers: Record<string, { exitCode: number; stdout?: string; stderr?: string }>) {
  const calls: string[] = [];
  return {
    calls,
    executeCommand: vi.fn(async (_url: string, command: string) => {
      calls.push(command);
      const key = Object.keys(answers).find((prefix) => command.startsWith(prefix));
      const answer = key ? answers[key] : { exitCode: 0 };
      return { exitCode: answer.exitCode, stdout: answer.stdout ?? '', stderr: answer.stderr ?? '' };
    }),
  };
}

describe('GitRebaseTool', () => {
  let module: TestingModule;
  let tool: GitRebaseTool;
  let remote: ReturnType<typeof fakeRemote>;

  const mockEnv = { getAgentUrl: vi.fn().mockResolvedValue(AGENT) };
  const execute = (args: GitRebaseArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  async function build(answers: Record<string, { exitCode: number; stdout?: string; stderr?: string }>) {
    remote = fakeRemote(answers);
    module = await createToolTest()
      .forTool(GitRebaseTool)
      .withMock(RemoteClient, remote)
      .withMock(EnvironmentService, mockEnv)
      .compile();
    tool = module.get(GitRebaseTool);
  }

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    beforeEach(() => build({}));

    it('requires the ref to rebase onto', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ onto: 'origin/main' })).not.toThrow();
    });
  });

  describe('execution', () => {
    it('answers clean when the rebase finished', async () => {
      await build({ 'git rebase': { exitCode: 0 } });

      const result = await tool.call({ onto: 'origin/main' });

      expect(result.data).toEqual({ clean: true });
      expect(remote.calls).toEqual(['git rebase origin/main']);
    });

    // The rebase stays in progress on purpose: whoever resolves the files finishes it in the same checkout.
    it('answers the unmerged files and leaves the rebase in progress', async () => {
      await build({
        'git rebase': { exitCode: 1, stderr: 'CONFLICT (content): Merge conflict in src/a.ts' },
        'git diff --name-only': { exitCode: 1, stdout: 'src/a.ts\nsrc/b.ts\n' },
      });

      const result = await tool.call({ onto: 'origin/main' });

      expect(result.data).toEqual({ clean: false, conflicts: ['src/a.ts', 'src/b.ts'] });
      expect(remote.calls).not.toContain('git rebase --abort');
    });

    it('aborts and reports a failure that has no conflicting files', async () => {
      await build({
        'git rebase': { exitCode: 128, stderr: 'fatal: invalid upstream origin/nope' },
        'git diff --name-only': { exitCode: 0, stdout: '' },
      });

      const result = await execute({ onto: 'origin/nope' });

      expect(result.data).toEqual({ clean: false });
      expect(result.error).toContain('invalid upstream');
      expect(remote.calls).toContain('git rebase --abort');
    });

    it('refuses a ref that is not a ref', async () => {
      await build({});

      await expect(tool.call({ onto: 'origin/main; rm -rf /' })).rejects.toThrow('not a usable git ref');
      expect(remote.calls).toHaveLength(0);
    });
  });
});
