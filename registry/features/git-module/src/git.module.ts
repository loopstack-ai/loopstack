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
