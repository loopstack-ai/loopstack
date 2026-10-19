import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { GitCheckoutStateTool } from '../git-checkout-state.tool.js';

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

/** A checkout that is clean, on a branch, with no rebase open. */
const SETTLED = {
  test: { exitCode: 1 },
  'git status --porcelain': { exitCode: 0, stdout: '' },
  'git diff --check': { exitCode: 0 },
  'git rev-parse --abbrev-ref': { exitCode: 0, stdout: 'engineer/run-1\n' },
};

describe('GitCheckoutStateTool', () => {
  let module: TestingModule;
  let tool: GitCheckoutStateTool;
  let remote: ReturnType<typeof fakeRemote>;

  const mockEnv = { getAgentUrl: vi.fn().mockResolvedValue(AGENT) };

  async function build(answers: Record<string, { exitCode: number; stdout?: string; stderr?: string }>) {
    remote = fakeRemote(answers);
    module = await createToolTest()
      .forTool(GitCheckoutStateTool)
      .withMock(RemoteClient, remote)
      .withMock(EnvironmentService, mockEnv)
      .compile();
    tool = module.get(GitCheckoutStateTool);
  }

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    beforeEach(() => build(SETTLED));

    it('takes no required argument', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ baseRef: 'origin/main', dir: 'loopstack' })).not.toThrow();
    });
  });

  describe('execution', () => {
    it('reports a settled checkout, and asks nothing about a base it was not given', async () => {
      await build(SETTLED);

      const result = await tool.call({});

      expect(result.data).toEqual({
        branch: 'engineer/run-1',
        rebaseInProgress: false,
        dirty: false,
        conflictMarkers: false,
      });
      expect(remote.calls.some((c) => c.includes('merge-base'))).toBe(false);
    });

    it('measures against the base when it is given', async () => {
      await build({
        ...SETTLED,
        'git merge-base --is-ancestor': { exitCode: 0 },
        'git rev-list': { exitCode: 0, stdout: '1\n' },
      });

      const result = await tool.call({ baseRef: 'origin/develop' });

      expect(result.data).toMatchObject({ onBase: true, commitsAhead: 1 });
      expect(remote.calls).toContain('git merge-base --is-ancestor origin/develop HEAD');
      expect(remote.calls).toContain('git rev-list --count origin/develop..HEAD');
    });

    it('reports a rebase that was started and never finished', async () => {
      await build({
        ...SETTLED,
        test: { exitCode: 0 },
        'git status --porcelain': { exitCode: 0, stdout: 'UU src/a.ts\n' },
        'git diff --check': { exitCode: 2 },
      });

      const result = await tool.call({});

      expect(result.data).toMatchObject({ rebaseInProgress: true, dirty: true, conflictMarkers: true });
    });

    it('refuses a base that is not a ref', async () => {
      await build(SETTLED);

      await expect(tool.call({ baseRef: '..' })).rejects.toThrow('not a usable git ref');
    });
  });
});
