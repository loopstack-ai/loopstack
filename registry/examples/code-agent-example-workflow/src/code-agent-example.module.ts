import { Module } from '@nestjs/common';
import { CodeAgentModule } from '@loopstack/code-agent';
import { CodeAgentExampleWorkflow } from './code-agent-example.workflow.js';

@Module({
  imports: [CodeAgentModule],
  providers: [CodeAgentExampleWorkflow],
  exports: [CodeAgentExampleWorkflow, CodeAgentModule],
})
export class CodeAgentExampleModule {}
