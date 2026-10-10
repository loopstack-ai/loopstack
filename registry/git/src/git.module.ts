import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';
import { GitController } from './controllers/index.js';
import {
  GitAddTool,
  GitBranchTool,
  GitCheckoutTool,
  GitCommitTool,
  GitConfigUserTool,
  GitDiffTool,
  GitFetchTool,
  GitLogTool,
  GitPullTool,
  GitPushTool,
  GitRemoteConfigureTool,
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
];

/**
 * NestJS module that provides the git version control tools (status, add, commit, push, pull, log,
 * diff, fetch, checkout, branch, remote/user config, worktree operations) and the `GitController` REST API.
 *
 * Registration:
 * - `GitModule` — bare import; registers all git tools and the REST controller unconditionally.
 * - `GitModule.forFeature({ enabled?: boolean; environments?: string[] })` — use to feature-gate the module
 *   so its tools are only active when enabled and/or limited to specific environments.
 *
 * Requires: `RemoteClientModule` must be available in the DI container — every git tool delegates to a remote
 * agent via `RemoteClient`, so the git commands run on the repository host.
 *
 * @public
 */
@Module({
  controllers: [GitController],
  providers: [...tools],
  exports: [...tools],
})
export class GitModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule {
    return {
      module: GitModule,
      providers: [registerFeature('git', config)],
    };
  }
}
