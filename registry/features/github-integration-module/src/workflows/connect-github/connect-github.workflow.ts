import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import {
  BaseWorkflow,
  CallbackSchema,
  Guard,
  LinkDocument,
  MarkdownDocument,
  Transition,
  Workflow,
} from '@loopstack/common';
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

interface ConnectGitHubState {
  requiresAuth?: boolean;
  user?: { login: string; name: string | null; email: string | null };
  repo?: { fullName: string; name: string; htmlUrl: string; private: boolean; defaultBranch: string };
  isNewRepo?: boolean;
  divergenceState?: 'none' | 'local_ahead' | 'remote_ahead' | 'diverged';
  hasUncommittedChanges?: boolean;
}

@Workflow({
  title: 'Connect to GitHub',
  description:
    'Connects your workspace to a GitHub repository.\nAuthenticates with GitHub, lets you create or link a repo, and configures git push access.',
  schema: z.object({}).strict(),
})
export class ConnectGitHubWorkflow extends BaseWorkflow<Record<string, never>, ConnectGitHubState> {
  constructor(
    private readonly gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool,
    private readonly gitHubCreateRepo: GitHubCreateRepoTool,
    private readonly gitHubListRepos: GitHubListReposTool,
    private readonly gitRemoteConfigure: GitRemoteConfigureTool,
    private readonly gitConfigUser: GitConfigUserTool,
    private readonly gitStatus: GitStatusTool,
    private readonly gitPush: GitPushTool,
    private readonly gitFetch: GitFetchTool,
    private readonly bash: BashTool,
    private readonly oAuth: OAuthWorkflow,
    private readonly askUser: AskUserWorkflow,
    private readonly tokenStore: OAuthTokenStore,
    private readonly clientMessageService: ClientMessageService,
  ) {
    super();
  }

  private async getGitHubToken(ctx: RunContext): Promise<string | undefined> {
    return (await this.tokenStore.getValidAccessToken(ctx.userId, 'github')) ?? undefined;
  }

  // ── Step 1: Check if already authenticated ──────────────────────────

  @Transition({ to: 'check_auth' })
  async start(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const result = await this.gitHubGetAuthenticatedUser.call();
    return {
      ...state,
      requiresAuth: result.data!.error === 'unauthorized',
      user: result.data!.user,
    };
  }

  // ── Step 2a: OAuth if needed ────────────────────────────────────────

  @Transition({ from: 'check_auth', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async launchOAuth(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const result = await this.oAuth.run(
      { provider: 'github', scopes: ['repo', 'user'] },
      { callback: { transition: 'authCompleted' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Sign in with GitHub',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );

    return state;
  }

  private needsAuth(state: ConnectGitHubState): boolean {
    return !!state.requiresAuth;
  }

  @Transition({ from: 'awaiting_auth', to: 'check_auth', wait: true, schema: CallbackSchema })
  async authCompleted(state: ConnectGitHubState, payload: { workflowId: string }): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      {
        status: 'success',
        label: 'GitHub authentication completed',
        workflowId: payload.workflowId,
        embed: true,
        expanded: false,
      },
      { id: `link_${payload.workflowId}` },
    );

    const result = await this.gitHubGetAuthenticatedUser.call();
    return { ...state, user: result.data!.user, requiresAuth: false };
  }

  // ── Step 2b: Ask create or link ─────────────────────────────────────

  @Transition({ from: 'check_auth', to: 'awaiting_choice' })
  async askCreateOrLink(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const result = await this.askUser.run(
      {
        question: 'Would you like to create a new GitHub repository or connect an existing one?',
        mode: 'options',
        options: ['Create new repository', 'Connect existing repository'],
      },
      { callback: { transition: 'choiceReceived' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Create or connect repository', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_choice` },
    );

    return state;
  }

  @Transition({ from: 'awaiting_choice', to: 'route_choice', wait: true, schema: CallbackSchema })
  async choiceReceived(state: ConnectGitHubState, payload: { data: { answer: string } }): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Create or connect repository', status: 'success', embed: true, expanded: false },
      { id: `link_choice` },
    );

    if (payload.data.answer === 'Connect existing repository') {
      const listResult = await this.gitHubListRepos.call({
        visibility: 'all',
        sort: 'updated',
        perPage: 30,
      });

      const repos = listResult.data!.repos ?? [];
      const repoNames = repos.map((r) => r.fullName);

      const askResult = await this.askUser.run(
        { question: 'Select a repository to connect:', mode: 'options', options: repoNames },
        { callback: { transition: 'repoSelected' } },
      );

      await this.documentStore.save(
        LinkDocument,
        { label: 'Select repository', workflowId: askResult.workflowId, embed: true, expanded: true },
        { id: `link_repo_select` },
      );
    } else {
      const askResult = await this.askUser.run(
        { question: 'Enter a name for your new repository:' },
        { callback: { transition: 'createRepo' } },
      );

      await this.documentStore.save(
        LinkDocument,
        { label: 'Repository name', workflowId: askResult.workflowId, embed: true, expanded: true },
        { id: `link_repo_name` },
      );
    }

    return state;
  }

  // ── Step 3a: Create new repo ────────────────────────────────────────

  @Transition({ from: 'route_choice', to: 'configure_remote', wait: true, schema: CallbackSchema })
  async createRepo(state: ConnectGitHubState, payload: { data: { answer: string } }): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Repository name', status: 'success', embed: true, expanded: false },
      { id: `link_repo_name` },
    );

    const repoName = payload.data.answer.trim();
    const createResult = await this.gitHubCreateRepo.call({
      name: repoName,
      private: true,
      autoInit: false,
    });

    return { ...state, repo: createResult.data!.repo, isNewRepo: true };
  }

  // ── Step 3b: Link existing repo ─────────────────────────────────────

  @Transition({ from: 'route_choice', to: 'configure_remote', wait: true, schema: CallbackSchema })
  async repoSelected(state: ConnectGitHubState, payload: { data: { answer: string } }): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Select repository', status: 'success', embed: true, expanded: false },
      { id: `link_repo_select` },
    );

    const fullName = payload.data.answer;
    const [, name] = fullName.split('/');

    return {
      ...state,
      repo: {
        fullName,
        name,
        htmlUrl: `https://github.com/${fullName}`,
        private: false,
        defaultBranch: 'main',
      },
      isNewRepo: false,
    };
  }

  // ── Step 4a: Check for uncommitted changes ───────────────────────────

  @Transition({ from: 'configure_remote', to: 'check_uncommitted' })
  async checkForUncommittedChanges(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const user = state.user;

    // Configure git user identity early
    if (user) {
      await this.gitConfigUser.call({
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
      });
    }

    const statusResult = await this.gitStatus.call();
    const status = statusResult.data!;
    const hasUncommittedChanges =
      status.staged.length > 0 ||
      status.modified.length > 0 ||
      status.untracked.length > 0 ||
      status.deleted.length > 0;

    return { ...state, hasUncommittedChanges };
  }

  // Clean workspace — skip straight to remote setup
  @Transition({ from: 'check_uncommitted', to: 'setup_remote' })
  @Guard('isCleanWorkspace')
  async skipCommitCheck(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    return state;
  }

  private isCleanWorkspace(state: ConnectGitHubState): boolean {
    return !state.hasUncommittedChanges;
  }

  // Uncommitted changes — ask user
  @Transition({ from: 'check_uncommitted', to: 'awaiting_commit_confirm' })
  async askCommitChanges(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const confirmResult = await this.askUser.run(
      {
        question:
          'There are uncommitted changes in your workspace. They need to be committed before connecting to a remote repository. Would you like to commit them now?',
        mode: 'options',
        options: ['Commit changes and continue', 'Cancel'],
      },
      { callback: { transition: 'uncommittedChangesHandled' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Uncommitted changes', workflowId: confirmResult.workflowId, embed: true, expanded: true },
      { id: `link_uncommitted` },
    );

    return state;
  }

  @Transition({ from: 'awaiting_commit_confirm', to: 'setup_remote', wait: true, schema: CallbackSchema })
  async uncommittedChangesHandled(
    state: ConnectGitHubState,
    payload: { data: { answer: string } },
  ): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Uncommitted changes', status: 'success', embed: true, expanded: false },
      { id: `link_uncommitted` },
    );

    if (payload.data.answer === 'Cancel') {
      return { ...state, repo: undefined };
    }

    await this.bash.call({ command: 'git add -A' });
    await this.bash.call({ command: 'git commit -m "Auto-commit before connecting to GitHub"' });

    return state;
  }

  // ── Step 4b: Configure remote and check for divergence ──────────────

  @Transition({ from: 'setup_remote', to: 'check_divergence' })
  async setupRemote(state: ConnectGitHubState, ctx: RunContext): Promise<ConnectGitHubState> {
    // If cancelled during commit confirmation, skip to done
    if (!state.repo) {
      return { ...state, divergenceState: 'none' };
    }

    const repo = state.repo;

    // Configure the remote URL (no credentials stored)
    const remoteUrl = `https://github.com/${repo.fullName}.git`;
    await this.gitRemoteConfigure.call({ url: remoteUrl });

    // Fetch remote refs using token for auth (token only exists in memory during the command)
    const token = await this.getGitHubToken(ctx);
    await this.gitFetch.call({ remote: 'origin', token });

    // Determine relationship between local and remote branches
    if (!state.isNewRepo) {
      const checkResult = await this.bash.call({
        command: [
          'REMOTE_EXISTS=$(git rev-parse --verify origin/main 2>/dev/null && echo yes || echo no)',
          'if [ "$REMOTE_EXISTS" = "no" ]; then echo "no_remote"; exit 0; fi',
          'LOCAL=$(git rev-parse main)',
          'REMOTE=$(git rev-parse origin/main)',
          'if [ "$LOCAL" = "$REMOTE" ]; then echo "same"; exit 0; fi',
          'git merge-base --is-ancestor main origin/main && echo "remote_ahead" && exit 0',
          'git merge-base --is-ancestor origin/main main && echo "local_ahead" && exit 0',
          'echo "diverged"',
        ].join(' && '),
      });
      const divergeState = checkResult.data!.stdout.trim().split('\n').pop()!.trim();
      if (divergeState === 'same' || divergeState === 'no_remote') {
        return { ...state, divergenceState: 'none' };
      } else {
        return { ...state, divergenceState: divergeState as 'local_ahead' | 'remote_ahead' | 'diverged' };
      }
    } else {
      return { ...state, divergenceState: 'none' };
    }
  }

  // ── Step 5a: No divergence or local ahead — just push ────────────────

  @Transition({ from: 'check_divergence', to: 'done' })
  @Guard('canPushDirectly')
  async pushDirectly(state: ConnectGitHubState, ctx: RunContext): Promise<ConnectGitHubState> {
    if (state.divergenceState === 'none') {
      // Already in sync — nothing to push
      return state;
    }
    // local_ahead — fast-forward push
    const statusResult = await this.gitStatus.call();
    const branch = statusResult.data!.branch ?? 'main';
    const token = await this.getGitHubToken(ctx);
    await this.gitPush.call({ remote: 'origin', branch, token });
    return state;
  }

  private canPushDirectly(state: ConnectGitHubState): boolean {
    return state.divergenceState === 'none' || state.divergenceState === 'local_ahead';
  }

  // ── Step 5b: Divergence detected — ask user how to resolve ──────────

  @Transition({ from: 'check_divergence', to: 'awaiting_sync_choice' })
  async askSyncStrategy(state: ConnectGitHubState): Promise<ConnectGitHubState> {
    const isRemoteAhead = state.divergenceState === 'remote_ahead';
    const question = isRemoteAhead
      ? 'The remote repository has newer commits than your workspace. How would you like to proceed?'
      : 'The remote repository has a different commit history than your workspace. How would you like to proceed?';

    const options = isRemoteAhead
      ? ['Pull remote changes into workspace', 'Push workspace code (overwrite remote)', 'Cancel (disconnect remote)']
      : [
          'Use remote code (replace local files with remote)',
          'Merge remote changes into workspace',
          'Push workspace code (overwrite remote)',
          'Cancel (disconnect remote)',
        ];

    const result = await this.askUser.run(
      { question, mode: 'options', options },
      { callback: { transition: 'syncStrategyChosen' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Resolve differences', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_sync` },
    );

    return state;
  }

  @Transition({ from: 'awaiting_sync_choice', to: 'done', wait: true, schema: CallbackSchema })
  async syncStrategyChosen(
    state: ConnectGitHubState,
    payload: { data: { answer: string } },
    ctx: RunContext,
  ): Promise<ConnectGitHubState> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Resolve differences', status: 'success', embed: true, expanded: false },
      { id: `link_sync` },
    );

    const answer = payload.data.answer;
    const statusResult = await this.gitStatus.call();
    const branch = statusResult.data!.branch ?? 'main';

    const token = await this.getGitHubToken(ctx);

    if (answer.startsWith('Use remote code')) {
      await this.bash.call({ command: `git reset --hard origin/${branch}` });
    } else if (answer.startsWith('Pull remote changes') || answer.startsWith('Merge remote changes')) {
      await this.bash.call({ command: `git merge origin/${branch} --allow-unrelated-histories --no-edit` });
      await this.gitPush.call({ remote: 'origin', branch, token });
    } else if (answer.startsWith('Push workspace code')) {
      await this.gitPush.call({ remote: 'origin', branch, force: true, token });
    } else {
      await this.bash.call({ command: 'git remote remove origin' });
      return { ...state, repo: undefined };
    }

    return state;
  }

  // ── Final: Show result ──────────────────────────────────────────────

  @Transition({ from: 'done', to: 'end' })
  async showSuccess(state: ConnectGitHubState, ctx: RunContext): Promise<unknown> {
    if (!state.repo) {
      await this.documentStore.save(MarkdownDocument, {
        markdown: '### Cancelled\n\nThe remote connection was removed. No changes were made.',
      });
      return { cancelled: true };
    }

    const repo = state.repo;
    await this.documentStore.save(MarkdownDocument, {
      markdown: `### Repository Connected\n\nYour workspace is now connected to [${repo.fullName}](${repo.htmlUrl}).\n\nAll future commits can be pushed to this repository using the git tools in your workflows.`,
    });

    this.clientMessageService.dispatchWorkspaceEvent('git.updated', ctx.workspaceId, ctx.userId);

    return { repo: repo.fullName, url: repo.htmlUrl };
  }
}
