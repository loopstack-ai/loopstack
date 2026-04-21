import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteClientModule } from '@loopstack/remote-client';
import { ExploreTask } from './tools/explore-task.tool';

@Module({
  imports: [LoopCoreModule, AgentModule, RemoteClientModule],
  providers: [ExploreTask],
  exports: [ExploreTask],
})
export class CodeAgentModule {}
