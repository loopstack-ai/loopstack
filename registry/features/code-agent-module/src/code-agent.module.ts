import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteClientModule } from '@loopstack/remote-client';
import { ExploreTask } from './tools/explore-task.tool';
import { ExploreAgentWorkflow } from './workflows/explore-agent.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule, RemoteClientModule],
  providers: [ExploreAgentWorkflow, ExploreTask],
  exports: [ExploreAgentWorkflow, ExploreTask],
})
export class CodeAgentModule {}
