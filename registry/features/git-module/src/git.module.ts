import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteAgentClientModule } from '@loopstack/remote-agent-client';
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
];

@Module({
  imports: [LoopCoreModule, RemoteAgentClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [GitController],
  providers: [...tools],
  exports: [...tools],
})
export class GitModule {}
