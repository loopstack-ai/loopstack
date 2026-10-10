import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientMessageService } from '@loopstack/core';
import { GitConfigUserTool, GitFetchTool, GitPushTool, GitRemoteConfigureTool, GitStatusTool } from '@loopstack/git';
import { GitHubCreateRepoTool, GitHubGetAuthenticatedUserTool, GitHubListReposTool } from '@loopstack/github';
import { AskUserWorkflow } from '@loopstack/hitl';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth';
import { BashTool } from '@loopstack/remote-client';
import { type ToolMock, createToolMock, runWorkflow } from '@loopstack/testing';
import { ConnectGitHubWorkflow } from '../connect-github.workflow.js';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};

const HISTORY_QUESTION =
  'The remote repository has a different commit history than your workspace. How would you like to proceed?';

/**
 * Runs the workflow's divergence check against real git: a bare "GitHub" remote, a seed clone that writes to
 * it, and the workspace clone. `bash` and `git_fetch` execute in the workspace; `git_status` reports its branch
 * the way the remote server parses `git status --porcelain=v1 -b`.
 */
describe('ConnectGitHubWorkflow against real git', () => {
  let root: string;
  let remote: string;
  let seed: string;
  let work: string;

  let status: ToolMock;
  let push: ToolMock;
  let fetch: ToolMock;
  let bash: ToolMock;
  let askUser: { run: ReturnType<typeof vi.fn> };

  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();

  const commit = (cwd: string, file: string) => {
    writeFileSync(join(cwd, file), file);
    git(cwd, 'add', file);
    git(cwd, 'commit', '-m', file);
  };

  /** Creates the bare remote with one commit on `branch` and clones it into the workspace. */
  const initRemote = (branch: string) => {
    git(root, 'init', '--bare', '-b', branch, remote);
    git(root, 'clone', remote, seed);
    git(seed, 'checkout', '-b', branch);
    commit(seed, 'initial.txt');
    git(seed, 'push', 'origin', branch);
    git(root, 'clone', remote, work);
  };

  const workspaceBranch = () => {
    const header = git(work, 'status', '--porcelain=v1', '-b').split('\n')[0];
    return header.substring(3).split('...')[0].trim();
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'connect-github-'));
    remote = join(root, 'remote.git');
    seed = join(root, 'seed');
    work = join(root, 'work');

    status = createToolMock('git_status');
    push = createToolMock('git_push');
    fetch = createToolMock('git_fetch');
    bash = createToolMock('bash');
    askUser = { run: vi.fn().mockResolvedValue(undefined) };

    status.call.mockImplementation(async () => ({
      data: { branch: workspaceBranch(), staged: [], modified: [], untracked: [], deleted: [] },
    }));
    fetch.call.mockImplementation(async () => {
      git(work, 'fetch', 'origin');
      return { data: { success: true } };
    });
    push.call.mockResolvedValue({ data: { success: true } });
    bash.call.mockImplementation(async ({ command }: { command: string }) => {
      const result = spawnSync('bash', ['-c', command], { cwd: work, env: GIT_ENV, encoding: 'utf8' });
      return { data: { output: result.stdout + result.stderr, exitCode: result.status ?? 1 } };
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const run = (syncAnswer?: string) => {
    const listRepos = createToolMock('github_list_repos');
    listRepos.call.mockResolvedValue({ data: { repos: [{ fullName: 'acme/app' }] } });
    const getUser = createToolMock('github_get_authenticated_user');
    getUser.call.mockResolvedValue({ data: { user: { login: 'octocat', name: null, email: null } } });
    const remoteConfigure = createToolMock('git_remote_configure');
    remoteConfigure.call.mockResolvedValue({ data: {} });
    const configUser = createToolMock('git_config_user');
    configUser.call.mockResolvedValue({ data: {} });

    return runWorkflow(
      ConnectGitHubWorkflow,
      {},
      {
        providers: [
          { provide: GitHubGetAuthenticatedUserTool, useValue: getUser },
          { provide: GitHubCreateRepoTool, useValue: createToolMock('github_create_repo') },
          { provide: GitHubListReposTool, useValue: listRepos },
          { provide: GitRemoteConfigureTool, useValue: remoteConfigure },
          { provide: GitConfigUserTool, useValue: configUser },
          { provide: GitStatusTool, useValue: status },
          { provide: GitPushTool, useValue: push },
          { provide: GitFetchTool, useValue: fetch },
          { provide: BashTool, useValue: bash },
          { provide: OAuthWorkflow, useValue: { run: vi.fn() } },
          { provide: AskUserWorkflow, useValue: askUser },
          { provide: OAuthTokenStore, useValue: { getValidAccessToken: vi.fn().mockResolvedValue('gh-token') } },
          { provide: ClientMessageService, useValue: { dispatchWorkspaceEvent: vi.fn() } },
        ],
        answers: {
          choiceReceived: { answer: 'Connect existing repository' },
          repoSelected: { answer: 'acme/app' },
          ...(syncAnswer ? { syncStrategyChosen: { answer: syncAnswer } } : {}),
        },
      },
    );
  };

  it('pushes directly when the workspace is ahead of the remote', async () => {
    initRemote('main');
    commit(work, 'local.txt');

    const result = await run();

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.path).toContain('pushDirectly');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'main', token: 'gh-token' });
  });

  it('does not push when the workspace matches the remote', async () => {
    initRemote('main');

    const result = await run();

    expect(result.status).toBe('completed');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).not.toHaveBeenCalled();
  });

  it('asks how to pull when the remote is ahead', async () => {
    initRemote('main');
    commit(seed, 'remote.txt');
    git(seed, 'push', 'origin', 'main');

    const result = await run();

    expect(result.status).toBe('waiting');
    expect(askUser.run).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question: 'The remote repository has newer commits than your workspace. How would you like to proceed?',
      }),
      expect.anything(),
    );
  });

  it('asks how to resolve diverged histories', async () => {
    initRemote('main');
    commit(seed, 'remote.txt');
    git(seed, 'push', 'origin', 'main');
    commit(work, 'local.txt');

    const result = await run();

    expect(result.status).toBe('waiting');
    expect(askUser.run).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: HISTORY_QUESTION }),
      expect.anything(),
    );
    expect(push.call).not.toHaveBeenCalled();
  });

  it('compares a branch other than main against the same remote branch', async () => {
    initRemote('master');
    commit(work, 'local.txt');

    const result = await run();

    expect(result.status).toBe('completed');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'master', token: 'gh-token' });
  });

  it('pushes the checked-out branch when the remote does not have it yet', async () => {
    initRemote('main');
    git(work, 'checkout', '-b', 'feature');
    commit(work, 'feature.txt');

    const result = await run();

    expect(result.status).toBe('completed');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'feature', token: 'gh-token' });
  });

  it('pushes an unrelated local branch when the remote only has another branch', async () => {
    initRemote('main');
    git(work, 'checkout', '--orphan', 'master');
    git(work, 'rm', '-rf', '--quiet', '.');
    commit(work, 'unrelated.txt');
    git(work, 'branch', '-D', 'main');

    const result = await run();

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'master', token: 'gh-token' });
  });

  it('fails the run when replacing local files with the remote fails', async () => {
    initRemote('main');
    commit(seed, 'remote.txt');
    git(seed, 'push', 'origin', 'main');
    commit(work, 'local.txt');
    writeFileSync(join(work, '.git', 'index.lock'), '');

    const result = await run('Use remote code (replace local files with remote)');

    expect(bash.call).toHaveBeenLastCalledWith({ command: 'git reset --hard origin/main' });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('git reset --hard origin/main');
  });

  it('fails the run on a detached HEAD instead of guessing a branch', async () => {
    initRemote('main');
    git(work, 'checkout', '--detach');

    const result = await run();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('HEAD (no branch)');
    expect(bash.call).not.toHaveBeenCalled();
    expect(push.call).not.toHaveBeenCalled();
  });
});
