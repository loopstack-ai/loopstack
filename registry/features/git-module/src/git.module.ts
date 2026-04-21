import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteClientModule } from '@loopstack/remote-client';
import { GitController } from './controllers';
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
} from './tools';

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
  imports: [LoopCoreModule, RemoteClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [GitController],
  providers: [...tools],
  exports: [...tools],
})
export class GitModule {}
