import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  LinkDocument,
  MarkdownDocument,
  ToolResult,
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

interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
}

interface GitHubRepo {
  fullName: string;
  name: string;
  htmlUrl: string;
  private: boolean;
  defaultBranch: string;
}

@Workflow({
  uiConfig: __dirname + '/connect-github.ui.yaml',
  schema: z.object({}).strict(),
})
export class ConnectGitHubWorkflow extends BaseWorkflow {
  @InjectTool() private gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool;
  @InjectTool() private gitHubCreateRepo: GitHubCreateRepoTool;
  @InjectTool() private gitHubListRepos: GitHubListReposTool;
  @InjectTool() private gitRemoteConfigure: GitRemoteConfigureTool;
  @InjectTool() private gitConfigUser: GitConfigUserTool;
  @InjectTool() private gitStatus: GitStatusTool;
  @InjectTool() private gitPush: GitPushTool;
  @InjectTool() private gitFetch: GitFetchTool;
  @InjectTool() private bash: BashTool;

  @InjectWorkflow() oAuth: OAuthWorkflow;
  @InjectWorkflow() askUser: AskUserWorkflow;

  @Inject() private tokenStore: OAuthTokenStore;
  @Inject() private clientMessageService: ClientMessageService;

  private async getGitHubToken(): Promise<string | undefined> {
    return (await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github')) ?? undefined;
  }

  requiresAuth?: boolean;
  user?: GitHubUser;
  repo?: GitHubRepo;
  isNewRepo?: boolean;
  divergenceState?: 'none' | 'local_ahead' | 'remote_ahead' | 'diverged';

  // ── Step 1: Check if already authenticated ──────────────────────────

  @Initial({ to: 'check_auth' })
  async start() {
    const result: ToolResult<{ error?: string; user?: GitHubUser }> = await this.gitHubGetAuthenticatedUser.call({});
    this.requiresAuth = result.data!.error === 'unauthorized';
    this.user = result.data!.user;
  }

  // ── Step 2a: OAuth if needed ────────────────────────────────────────

  @Transition({ from: 'check_auth', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async launchOAuth() {
    const result = await this.oAuth.run(
      { provider: 'github', scopes: ['repo', 'user'] },
      { alias: 'oAuth', callback: { transition: 'authCompleted' } },
    );

    await this.repository.save(
      LinkDocument,
      {
        label: 'Sign in with GitHub',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
  }

  private needsAuth(): boolean {
    return !!this.requiresAuth;
  }

  @Transition({ from: 'awaiting_auth', to: 'check_auth', wait: true, schema: CallbackSchema })
  async authCompleted(payload: { workflowId: string }) {
    await this.repository.save(
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

    const result: ToolResult<{ user?: GitHubUser }> = await this.gitHubGetAuthenticatedUser.call({});
    this.user = result.data!.user;
    this.requiresAuth = false;
  }

  // ── Step 2b: Ask create or link ─────────────────────────────────────

  @Transition({ from: 'check_auth', to: 'awaiting_choice' })
  async askCreateOrLink() {
    const result = await this.askUser.run(
      {
        question: 'Would you like to create a new GitHub repository or connect an existing one?',
        mode: 'options',
        options: ['Create new repository', 'Connect existing repository'],
      },
      { alias: 'chooseAction', callback: { transition: 'choiceReceived' } },
    );

    await this.repository.save(
      LinkDocument,
      { label: 'Create or connect repository', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_choice` },
    );
  }

  @Transition({ from: 'awaiting_choice', to: 'route_choice', wait: true, schema: CallbackSchema })
  async choiceReceived(payload: { data: { answer: string } }) {
    await this.repository.save(
      LinkDocument,
      { label: 'Create or connect repository', status: 'success', embed: true, expanded: false },
      { id: `link_choice` },
    );

    if (payload.data.answer === 'Connect existing repository') {
      const listResult: ToolResult<{
        repos: Array<{ fullName: string; name: string; htmlUrl: string; private: boolean; defaultBranch: string }>;
      }> = await this.gitHubListRepos.call({ visibility: 'all', sort: 'updated', perPage: 30 });

      const repos = listResult.data!.repos ?? [];
      const repoNames = repos.map((r) => r.fullName);

      const askResult = await this.askUser.run(
        { question: 'Select a repository to connect:', mode: 'options', options: repoNames },
        { alias: 'chooseRepo', callback: { transition: 'repoSelected' } },
      );

      await this.repository.save(
        LinkDocument,
        { label: 'Select repository', workflowId: askResult.workflowId, embed: true, expanded: true },
        { id: `link_repo_select` },
      );
    } else {
      const askResult = await this.askUser.run(
        { question: 'Enter a name for your new repository:' },
        { alias: 'repoName', callback: { transition: 'createRepo' } },
      );

      await this.repository.save(
        LinkDocument,
        { label: 'Repository name', workflowId: askResult.workflowId, embed: true, expanded: true },
        { id: `link_repo_name` },
      );
    }
  }

  // ── Step 3a: Create new repo ────────────────────────────────────────

  @Transition({ from: 'route_choice', to: 'configure_remote', wait: true, schema: CallbackSchema })
  async createRepo(payload: { data: { answer: string } }) {
    await this.repository.save(
      LinkDocument,
      { label: 'Repository name', status: 'success', embed: true, expanded: false },
      { id: `link_repo_name` },
    );

    const repoName = payload.data.answer.trim();
    const createResult: ToolResult<{ repo: GitHubRepo }> = await this.gitHubCreateRepo.call({
      name: repoName,
      private: true,
      autoInit: false,
    });

    this.repo = createResult.data!.repo;
    this.isNewRepo = true;
  }

  // ── Step 3b: Link existing repo ─────────────────────────────────────

  @Transition({ from: 'route_choice', to: 'configure_remote', wait: true, schema: CallbackSchema })
  async repoSelected(payload: { data: { answer: string } }) {
    await this.repository.save(
      LinkDocument,
      { label: 'Select repository', status: 'success', embed: true, expanded: false },
      { id: `link_repo_select` },
    );

    const fullName = payload.data.answer;
    const [, name] = fullName.split('/');

    this.repo = {
      fullName,
      name,
      htmlUrl: `https://github.com/${fullName}`,
      private: false,
      defaultBranch: 'main',
    };
    this.isNewRepo = false;
  }

  // ── Step 4a: Check for uncommitted changes ───────────────────────────

  hasUncommittedChanges?: boolean;

  @Transition({ from: 'configure_remote', to: 'check_uncommitted' })
  async checkForUncommittedChanges() {
    const user = this.user;

    // Configure git user identity early
    if (user) {
      await this.gitConfigUser.call({
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
      });
    }

    const statusResult: ToolResult<{ staged: string[]; modified: string[]; untracked: string[]; deleted: string[] }> =
      await this.gitStatus.call();
    const status = statusResult.data!;
    this.hasUncommittedChanges =
      status.staged.length > 0 ||
      status.modified.length > 0 ||
      status.untracked.length > 0 ||
      status.deleted.length > 0;
  }

  // Clean workspace — skip straight to remote setup
  @Transition({ from: 'check_uncommitted', to: 'setup_remote' })
  @Guard('isCleanWorkspace')
  async skipCommitCheck() {}

  private isCleanWorkspace(): boolean {
    return !this.hasUncommittedChanges;
  }

  // Uncommitted changes — ask user
  @Transition({ from: 'check_uncommitted', to: 'awaiting_commit_confirm' })
  async askCommitChanges() {
    const confirmResult = await this.askUser.run(
      {
        question:
          'There are uncommitted changes in your workspace. They need to be committed before connecting to a remote repository. Would you like to commit them now?',
        mode: 'options',
        options: ['Commit changes and continue', 'Cancel'],
      },
      { alias: 'commitChanges', callback: { transition: 'uncommittedChangesHandled' } },
    );

    await this.repository.save(
      LinkDocument,
      { label: 'Uncommitted changes', workflowId: confirmResult.workflowId, embed: true, expanded: true },
      { id: `link_uncommitted` },
    );
  }

  @Transition({ from: 'awaiting_commit_confirm', to: 'setup_remote', wait: true, schema: CallbackSchema })
  async uncommittedChangesHandled(payload: { data: { answer: string } }) {
    await this.repository.save(
      LinkDocument,
      { label: 'Uncommitted changes', status: 'success', embed: true, expanded: false },
      { id: `link_uncommitted` },
    );

    if (payload.data.answer === 'Cancel') {
      this.repo = undefined;
      return;
    }

    await this.bash.call({ command: 'git add -A' });
    await this.bash.call({ command: 'git commit -m "Auto-commit before connecting to GitHub"' });
  }

  // ── Step 4b: Configure remote and check for divergence ──────────────

  @Transition({ from: 'setup_remote', to: 'check_divergence' })
  async setupRemote() {
    // If cancelled during commit confirmation, skip to done
    if (!this.repo) {
      this.divergenceState = 'none';
      return;
    }

    const repo = this.repo;

    // Configure the remote URL (no credentials stored)
    const remoteUrl = `https://github.com/${repo.fullName}.git`;
    await this.gitRemoteConfigure.call({ url: remoteUrl });

    // Fetch remote refs using token for auth (token only exists in memory during the command)
    const token = await this.getGitHubToken();
    await this.gitFetch.call({ remote: 'origin', token });

    // Determine relationship between local and remote branches
    if (!this.isNewRepo) {
      const checkResult = (await this.bash.call({
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
      })) as ToolResult<{ stdout: string }>;
      const state = checkResult.data!.stdout.trim().split('\n').pop()!.trim();
      if (state === 'same' || state === 'no_remote') {
        this.divergenceState = 'none';
      } else {
        this.divergenceState = state as 'local_ahead' | 'remote_ahead' | 'diverged';
      }
    } else {
      this.divergenceState = 'none';
    }
  }

  // ── Step 5a: No divergence or local ahead — just push ────────────────

  @Transition({ from: 'check_divergence', to: 'done' })
  @Guard('canPushDirectly')
  async pushDirectly() {
    if (this.divergenceState === 'none') {
      // Already in sync — nothing to push
      return;
    }
    // local_ahead — fast-forward push
    const statusResult: ToolResult<{ branch: string }> = await this.gitStatus.call();
    const branch = statusResult.data!.branch ?? 'main';
    const token = await this.getGitHubToken();
    await this.gitPush.call({ remote: 'origin', branch, token });
  }

  private canPushDirectly(): boolean {
    return this.divergenceState === 'none' || this.divergenceState === 'local_ahead';
  }

  // ── Step 5b: Divergence detected — ask user how to resolve ──────────

  @Transition({ from: 'check_divergence', to: 'awaiting_sync_choice' })
  async askSyncStrategy() {
    const isRemoteAhead = this.divergenceState === 'remote_ahead';
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
      { alias: 'syncStrategy', callback: { transition: 'syncStrategyChosen' } },
    );

    await this.repository.save(
      LinkDocument,
      { label: 'Resolve differences', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_sync` },
    );
  }

  @Transition({ from: 'awaiting_sync_choice', to: 'done', wait: true, schema: CallbackSchema })
  async syncStrategyChosen(payload: { data: { answer: string } }) {
    await this.repository.save(
      LinkDocument,
      { label: 'Resolve differences', status: 'success', embed: true, expanded: false },
      { id: `link_sync` },
    );

    const answer = payload.data.answer;
    const statusResult: ToolResult<{ branch: string }> = await this.gitStatus.call();
    const branch = statusResult.data!.branch ?? 'main';

    const token = await this.getGitHubToken();

    if (answer.startsWith('Use remote code')) {
      await this.bash.call({ command: `git reset --hard origin/${branch}` });
    } else if (answer.startsWith('Pull remote changes') || answer.startsWith('Merge remote changes')) {
      await this.bash.call({ command: `git merge origin/${branch} --allow-unrelated-histories --no-edit` });
      await this.gitPush.call({ remote: 'origin', branch, token });
    } else if (answer.startsWith('Push workspace code')) {
      await this.gitPush.call({ remote: 'origin', branch, force: true, token });
    } else {
      await this.bash.call({ command: 'git remote remove origin' });
      this.repo = undefined;
    }
  }

  // ── Final: Show result ──────────────────────────────────────────────

  @Final({ from: 'done' })
  async showSuccess() {
    if (!this.repo) {
      await this.repository.save(MarkdownDocument, {
        markdown: '### Cancelled\n\nThe remote connection was removed. No changes were made.',
      });
      return { cancelled: true };
    }

    const repo = this.repo;
    await this.repository.save(MarkdownDocument, {
      markdown: `### Repository Connected\n\nYour workspace is now connected to [${repo.fullName}](${repo.htmlUrl}).\n\nAll future commits can be pushed to this repository using the git tools in your workflows.`,
    });

    this.clientMessageService.dispatchWorkspaceEvent(
      'git.updated',
      this.ctx.context.workspaceId,
      this.ctx.context.userId,
    );

    return { repo: repo.fullName, url: repo.htmlUrl };
  }
}
