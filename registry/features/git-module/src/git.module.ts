import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { RemoteClientModule } from '@loopstack/remote-client';
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
  imports: [RemoteClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [GitController],
  providers: [...tools],
  exports: [...tools],
})
export class GitModule {}
