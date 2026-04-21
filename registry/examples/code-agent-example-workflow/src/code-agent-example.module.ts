import { Module } from '@nestjs/common';
import { CodeAgentModule } from '@loopstack/code-agent';
import { LoopCoreModule } from '@loopstack/core';
import { CodeAgentExampleWorkflow } from './code-agent-example.workflow';

@Module({
  imports: [LoopCoreModule, CodeAgentModule],
  providers: [CodeAgentExampleWorkflow],
  exports: [CodeAgentExampleWorkflow],
})
export class CodeAgentExampleModule {}
