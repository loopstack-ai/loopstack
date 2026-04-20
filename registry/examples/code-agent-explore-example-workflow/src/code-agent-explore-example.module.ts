import { Module } from '@nestjs/common';
import { CodeAgentModule } from '@loopstack/code-agent';
import { LoopCoreModule } from '@loopstack/core';
import { CodeAgentExploreExampleWorkflow } from './code-agent-explore-example.workflow';

@Module({
  imports: [LoopCoreModule, CodeAgentModule],
  providers: [CodeAgentExploreExampleWorkflow],
  exports: [CodeAgentExploreExampleWorkflow],
})
export class CodeAgentExploreExampleModule {}
