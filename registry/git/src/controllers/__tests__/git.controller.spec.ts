import { describe, expect, it, vi } from 'vitest';
import type { CurrentUserInterface } from '@loopstack/common';
import type { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import type { GitRepository, GitRepositorySource } from '../../repositories/index.js';
import { GitController } from '../git.controller.js';

const USER = { id: 'u1' } as unknown as CurrentUserInterface;

const REPOS: GitRepository[] = [
  { key: 'loopstack', dir: 'loopstack', url: 'https://github.com/acme/loopstack', primary: true },
  { key: 'platform', dir: 'platform', url: 'https://github.com/acme/platform' },
];

function controller(source?: GitRepositorySource) {
  const remote = { gitStatus: vi.fn(), gitLog: vi.fn(), gitRemote: vi.fn() };
  const env = { getAgentUrlForWorkspace: vi.fn().mockResolvedValue('https://agent.example') };
  return {
    controller: new GitController(remote as unknown as RemoteClient, env as unknown as EnvironmentService, source),
    remote,
    env,
  };
}

describe('GitController', () => {
  describe('repos', () => {
    it('answers what the application declared', async () => {
      const list = vi.fn().mockResolvedValue(REPOS);
      const { controller: c } = controller({ list });

      await expect(c.getRepos('ws-1', USER)).resolves.toEqual({ repos: REPOS });
      expect(list).toHaveBeenCalledWith('ws-1');
    });

    // Nothing has to declare repositories: an empty list reads as "one repository, at the root".
    it('answers an empty list when nothing is registered', async () => {
      const { controller: c } = controller();

      await expect(c.getRepos('ws-1', USER)).resolves.toEqual({ repos: [] });
    });

    it('takes a source that answers synchronously', async () => {
      const { controller: c } = controller({ list: () => REPOS });

      await expect(c.getRepos('ws-1', USER)).resolves.toEqual({ repos: REPOS });
    });
  });

  describe('reads', () => {
    it('addresses the repository and the slot the request names', async () => {
      const { controller: c, remote, env } = controller();
      remote.gitStatus.mockResolvedValue({ branch: 'main' });

      await c.getStatus('ws-1', 'sandbox', 'loopstack', USER);

      expect(env.getAgentUrlForWorkspace).toHaveBeenCalledWith('ws-1', 'sandbox');
      expect(remote.gitStatus).toHaveBeenCalledWith('https://agent.example', { dir: 'loopstack' });
    });

    it('parses the log limit and leaves it unset when there is none', async () => {
      const { controller: c, remote } = controller();

      await c.getLog('ws-1', '10', undefined, undefined, USER);
      expect(remote.gitLog).toHaveBeenCalledWith('https://agent.example', { limit: 10, dir: undefined });

      await c.getLog('ws-1', undefined, undefined, undefined, USER);
      expect(remote.gitLog).toHaveBeenCalledWith('https://agent.example', { limit: undefined, dir: undefined });
    });
  });
});
