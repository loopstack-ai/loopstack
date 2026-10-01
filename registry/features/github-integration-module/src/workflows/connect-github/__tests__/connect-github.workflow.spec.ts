import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientMessageService } from '@loopstack/core';
import {
  GitConfigUserTool,
  GitFetchTool,
  GitPushTool,
  GitRemoteConfigureTool,
  GitStatusTool,
} from '@loopstack/git-module';
import { GitHubCreateRepoTool, GitHubGetAuthenticatedUserTool, GitHubListReposTool } from '@loopstack/github-module';
import { AskUserWorkflow } from '@loopstack/hitl';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth-module';
import { BashTool } from '@loopstack/remote-client';
import { type ToolMock, createToolMock, runWorkflow } from '@loopstack/testing';
import { ConnectGitHubWorkflow } from '../connect-github.workflow.js';

const user = { login: 'octocat', name: null, email: null };
const createdRepo = {
  fullName: 'octocat/new-repo',
  name: 'new-repo',
  htmlUrl: 'https://github.com/octocat/new-repo',
  private: true,
  defaultBranch: 'main',
};
const cleanStatus = { branch: 'feature', staged: [], modified: [], untracked: [], deleted: [] };

describe('ConnectGitHubWorkflow', () => {
  let getUser: ToolMock;
  let createRepo: ToolMock;
  let listRepos: ToolMock;
  let remoteConfigure: ToolMock;
  let configUser: ToolMock;
  let status: ToolMock;
  let push: ToolMock;
  let fetch: ToolMock;
  let bash: ToolMock;
  let oAuth: { run: ReturnType<typeof vi.fn> };
  let askUser: { run: ReturnType<typeof vi.fn> };
  let tokenStore: { getValidAccessToken: ReturnType<typeof vi.fn> };
  let clientMessages: { dispatchWorkspaceEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    getUser = createToolMock('github_get_authenticated_user');
    createRepo = createToolMock('github_create_repo');
    listRepos = createToolMock('github_list_repos');
    remoteConfigure = createToolMock('git_remote_configure');
    configUser = createToolMock('git_config_user');
    status = createToolMock('git_status');
    push = createToolMock('git_push');
    fetch = createToolMock('git_fetch');
    bash = createToolMock('bash');
    oAuth = { run: vi.fn().mockResolvedValue(undefined) };
    askUser = { run: vi.fn().mockResolvedValue(undefined) };
    tokenStore = { getValidAccessToken: vi.fn().mockResolvedValue('gh-token') };
    clientMessages = { dispatchWorkspaceEvent: vi.fn() };

    getUser.call.mockResolvedValue({ data: { user } });
    createRepo.call.mockResolvedValue({ data: { repo: createdRepo } });
    remoteConfigure.call.mockResolvedValue({ data: {} });
    configUser.call.mockResolvedValue({ data: {} });
    status.call.mockResolvedValue({ data: cleanStatus });
    push.call.mockResolvedValue({ data: {} });
    fetch.call.mockResolvedValue({ data: {} });
    bash.call.mockResolvedValue({ data: { output: '', exitCode: 0 } });
  });

  const run = (answers: Record<string, unknown>) =>
    runWorkflow(
      ConnectGitHubWorkflow,
      {},
      {
        providers: [
          { provide: GitHubGetAuthenticatedUserTool, useValue: getUser },
          { provide: GitHubCreateRepoTool, useValue: createRepo },
          { provide: GitHubListReposTool, useValue: listRepos },
          { provide: GitRemoteConfigureTool, useValue: remoteConfigure },
          { provide: GitConfigUserTool, useValue: configUser },
          { provide: GitStatusTool, useValue: status },
          { provide: GitPushTool, useValue: push },
          { provide: GitFetchTool, useValue: fetch },
          { provide: BashTool, useValue: bash },
          { provide: OAuthWorkflow, useValue: oAuth },
          { provide: AskUserWorkflow, useValue: askUser },
          { provide: OAuthTokenStore, useValue: tokenStore },
          { provide: ClientMessageService, useValue: clientMessages },
        ],
        answers,
      },
    );

  const linkExisting = (divergence: string, syncAnswer?: string) => {
    listRepos.call.mockResolvedValue({ data: { repos: [{ fullName: 'acme/app' }, { fullName: 'acme/web' }] } });
    bash.call.mockResolvedValueOnce({ data: { output: `${divergence}\n`, exitCode: 0 } });
    return run({
      choiceReceived: { answer: 'Connect existing repository' },
      repoSelected: { answer: 'acme/app' },
      ...(syncAnswer ? { syncStrategyChosen: { answer: syncAnswer } } : {}),
    });
  };

  it('creates a new repository for an authenticated user and connects it without pushing', async () => {
    const result = await run({
      choiceReceived: { answer: 'Create new repository' },
      createRepo: { answer: '  new-repo  ' },
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.path).toEqual([
      'start',
      'askCreateOrLink',
      'choiceReceived',
      'createRepo',
      'checkForUncommittedChanges',
      'skipCommitCheck',
      'setupRemote',
      'pushDirectly',
      'showSuccess',
    ]);
    expect(oAuth.run).not.toHaveBeenCalled();
    expect(askUser.run).toHaveBeenNthCalledWith(
      2,
      { question: 'Enter a name for your new repository:' },
      expect.objectContaining({ callback: { transition: 'createRepo' } }),
    );
    expect(createRepo.call).toHaveBeenCalledWith({ name: 'new-repo', private: true, autoInit: false });
    expect(configUser.call).toHaveBeenCalledWith({
      name: 'octocat',
      email: 'octocat@users.noreply.github.com',
    });
    expect(remoteConfigure.call).toHaveBeenCalledWith({ url: 'https://github.com/octocat/new-repo.git' });
    expect(tokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
    expect(fetch.call).toHaveBeenCalledWith({ remote: 'origin', token: 'gh-token' });
    expect(bash.call).not.toHaveBeenCalled();
    expect(push.call).not.toHaveBeenCalled();
    expect(result.result).toEqual({ repo: 'octocat/new-repo', url: 'https://github.com/octocat/new-repo' });
    expect(result.document('markdown')).toEqual({
      markdown: expect.stringContaining('connected to [octocat/new-repo](https://github.com/octocat/new-repo)'),
    });
    expect(clientMessages.dispatchWorkspaceEvent).toHaveBeenCalledWith('git.updated', 'test-workspace', 'test-user');
  });

  it('launches OAuth when GitHub rejects the token and resumes after sign-in', async () => {
    getUser.call
      .mockRejectedValueOnce(new Error('No valid GitHub token found. Please authenticate first.'))
      .mockResolvedValueOnce({ data: { user: { login: 'octocat', name: 'Octo Cat', email: 'o@c.at' } } });

    const result = await run({ authCompleted: {} });

    expect(result.status).toBe('waiting');
    expect(result.place).toBe('awaiting_choice');
    expect(result.path).toEqual(['start', 'launchOAuth', 'authCompleted', 'askCreateOrLink']);
    expect(oAuth.run).toHaveBeenCalledWith(
      { provider: 'github', scopes: ['repo', 'user'] },
      expect.objectContaining({ callback: { transition: 'authCompleted' } }),
    );
    expect(getUser.call).toHaveBeenCalledTimes(2);
  });

  it('parks awaiting sign-in until OAuth completes', async () => {
    getUser.call.mockRejectedValueOnce(new Error('GitHub token was rejected. Please re-authenticate.'));

    const result = await run({});

    expect(result.status).toBe('waiting');
    expect(result.place).toBe('awaiting_auth');
    expect(askUser.run).not.toHaveBeenCalled();
  });

  it('fails on errors unrelated to authentication', async () => {
    getUser.call.mockRejectedValueOnce(new Error('GitHub API is down'));

    const result = await run({});

    expect(result.status).toBe('failed');
    expect(result.error).toContain('GitHub API is down');
    expect(oAuth.run).not.toHaveBeenCalled();
  });

  it('links an existing repository that is already in sync', async () => {
    const result = await linkExisting('same');

    expect(result.status).toBe('completed');
    expect(listRepos.call).toHaveBeenCalledWith({ visibility: 'all', sort: 'updated', perPage: 30 });
    expect(askUser.run).toHaveBeenNthCalledWith(
      2,
      { question: 'Select a repository to connect:', mode: 'options', options: ['acme/app', 'acme/web'] },
      expect.objectContaining({ callback: { transition: 'repoSelected' } }),
    );
    expect(createRepo.call).not.toHaveBeenCalled();
    expect(remoteConfigure.call).toHaveBeenCalledWith({ url: 'https://github.com/acme/app.git' });
    expect(bash.call).toHaveBeenCalledTimes(1);
    expect(push.call).not.toHaveBeenCalled();
    expect(result.result).toEqual({ repo: 'acme/app', url: 'https://github.com/acme/app' });
  });

  it('treats a missing remote branch as in sync', async () => {
    const result = await linkExisting('no_remote');

    expect(result.status).toBe('completed');
    expect(result.path).toContain('pushDirectly');
    expect(push.call).not.toHaveBeenCalled();
  });

  it('pushes directly when the workspace is ahead of the remote', async () => {
    const result = await linkExisting('local_ahead');

    expect(result.status).toBe('completed');
    expect(result.path).toContain('pushDirectly');
    expect(result.path).not.toContain('askSyncStrategy');
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'feature', token: 'gh-token' });
  });

  it('offers pull/push/cancel when the remote is ahead and force-pushes on request', async () => {
    const result = await linkExisting('remote_ahead', 'Push workspace code (overwrite remote)');

    expect(result.status).toBe('completed');
    expect(askUser.run).toHaveBeenLastCalledWith(
      {
        question: 'The remote repository has newer commits than your workspace. How would you like to proceed?',
        mode: 'options',
        options: [
          'Pull remote changes into workspace',
          'Push workspace code (overwrite remote)',
          'Cancel (disconnect remote)',
        ],
      },
      expect.objectContaining({ callback: { transition: 'syncStrategyChosen' } }),
    );
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'feature', force: true, token: 'gh-token' });
  });

  it('merges remote changes and pushes when pulling', async () => {
    const result = await linkExisting('remote_ahead', 'Pull remote changes into workspace');

    expect(result.status).toBe('completed');
    expect(bash.call).toHaveBeenLastCalledWith({
      command: 'git merge origin/feature --allow-unrelated-histories --no-edit',
    });
    expect(push.call).toHaveBeenCalledWith({ remote: 'origin', branch: 'feature', token: 'gh-token' });
  });

  it('replaces local files with the remote on diverged history', async () => {
    const result = await linkExisting('diverged', 'Use remote code (replace local files with remote)');

    expect(result.status).toBe('completed');
    expect(askUser.run).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question:
          'The remote repository has a different commit history than your workspace. How would you like to proceed?',
        options: expect.arrayContaining(['Merge remote changes into workspace']),
      }),
      expect.anything(),
    );
    expect(bash.call).toHaveBeenLastCalledWith({ command: 'git reset --hard origin/feature' });
    expect(push.call).not.toHaveBeenCalled();
    expect(result.result).toEqual({ repo: 'acme/app', url: 'https://github.com/acme/app' });
  });

  it('disconnects the remote when syncing is cancelled', async () => {
    const result = await linkExisting('diverged', 'Cancel (disconnect remote)');

    expect(result.status).toBe('completed');
    expect(bash.call).toHaveBeenLastCalledWith({ command: 'git remote remove origin' });
    expect(push.call).not.toHaveBeenCalled();
    expect(result.result).toEqual({ cancelled: true });
    expect(result.document('markdown')).toEqual({ markdown: expect.stringContaining('### Cancelled') });
    expect(clientMessages.dispatchWorkspaceEvent).not.toHaveBeenCalled();
  });

  describe('with uncommitted changes', () => {
    beforeEach(() => {
      status.call.mockResolvedValue({ data: { ...cleanStatus, modified: ['README.md'] } });
    });

    it('commits the changes before configuring the remote', async () => {
      const result = await run({
        choiceReceived: { answer: 'Create new repository' },
        createRepo: { answer: 'new-repo' },
        uncommittedChangesHandled: { answer: 'Commit changes and continue' },
      });

      expect(result.status).toBe('completed');
      expect(result.path).toContain('askCommitChanges');
      expect(result.path).not.toContain('skipCommitCheck');
      expect(bash.call.mock.calls.map(([args]) => args)).toEqual([
        { command: 'git add -A' },
        { command: 'git commit -m "Auto-commit before connecting to GitHub"' },
      ]);
      expect(remoteConfigure.call).toHaveBeenCalled();
      expect(result.result).toEqual({ repo: 'octocat/new-repo', url: 'https://github.com/octocat/new-repo' });
    });

    it('skips remote setup when the user cancels', async () => {
      const result = await run({
        choiceReceived: { answer: 'Create new repository' },
        createRepo: { answer: 'new-repo' },
        uncommittedChangesHandled: { answer: 'Cancel' },
      });

      expect(result.status).toBe('completed');
      expect(bash.call).not.toHaveBeenCalled();
      expect(remoteConfigure.call).not.toHaveBeenCalled();
      expect(fetch.call).not.toHaveBeenCalled();
      expect(push.call).not.toHaveBeenCalled();
      expect(result.result).toEqual({ cancelled: true });
    });
  });
});
