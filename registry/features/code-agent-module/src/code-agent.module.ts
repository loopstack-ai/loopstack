import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { RemoteClientModule } from '@loopstack/remote-client';
import { ExploreTask } from './tools/explore-task.tool';

@Module({
  imports: [AgentModule, RemoteClientModule],
  providers: [ExploreTask],
  exports: [ExploreTask, AgentModule, RemoteClientModule],
})
export class CodeAgentModule {}
