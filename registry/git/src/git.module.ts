import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';
import { GitController } from './controllers/index.js';
import { GIT_TOKEN_SOURCE, GitTokenService, type GitToolConfig } from './token/index.js';
import {
  GitAddTool,
  GitBranchTool,
  GitCheckoutStateTool,
  GitCheckoutTool,
  GitCommitTool,
  GitConfigUserTool,
  GitDiffTool,
  GitFetchTool,
  GitLogTool,
  GitPullTool,
  GitPushTool,
  GitRebaseTool,
  GitRemoteConfigureTool,
  GitSquashTool,
  GitStatusTool,
  GitWorktreeAddTool,
  GitWorktreeListTool,
  GitWorktreePruneTool,
  GitWorktreeRemoveTool,
} from './tools/index.js';

const tools = [
  GitStatusTool,
  GitAddTool,
  GitCommitTool,
  GitPushTool,
  GitPullTool,
  GitLogTool,
  GitDiffTool,
  GitFetchTool,
  GitCheckoutTool,
  GitBranchTool,
  GitRemoteConfigureTool,
  GitConfigUserTool,
  GitWorktreeListTool,
  GitWorktreeAddTool,
  GitWorktreeRemoveTool,
  GitWorktreePruneTool,
  GitSquashTool,
  GitRebaseTool,
  GitCheckoutStateTool,
];

/**
 * NestJS module that provides the git version control tools (status, add, commit, push, pull, log,
 * diff, fetch, checkout, branch, remote/user config, worktree operations), the operations that take several
 * git commands (squash, rebase, checkout state) and the `GitController` REST API.
 *
 * Registration:
 * - `GitModule` — bare import; registers all git tools and the REST controller unconditionally.
 * - `GitModule.forFeature({ enabled?: boolean; environments?: string[] })` — use to feature-gate the module
 *   so its tools are only active when enabled and/or limited to specific environments.
 * - `GitModule.forRoot({ tokenEnv | tokenSecret | oauthProvider })` — the same tools, with a default source
 *   for the credential `git_push`, `git_pull` and `git_fetch` authenticate with. A single call overrides it
 *   through its config.
 *
 * Requires: `RemoteClientModule` must be available in the DI container — every git tool delegates to a remote
 * agent via `RemoteClient`, so the git commands run on the repository host.
 *
 * @public
 */
@Module({
  controllers: [GitController],
  providers: [GitTokenService, ...tools],
  exports: [GitTokenService, ...tools],
})
export class GitModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule {
    return {
      module: GitModule,
      providers: [registerFeature('git', config)],
    };
  }

  /** Names where the credential comes from by default — an environment variable, a workspace secret or an
   * OAuth provider. Never the token itself. */
  static forRoot(source: GitToolConfig): DynamicModule {
    return {
      module: GitModule,
      providers: [{ provide: GIT_TOKEN_SOURCE, useValue: source }],
    };
  }
}
