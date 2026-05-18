import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { DelegateErrorWorkflow } from './delegate-error.workflow.js';
import { FailingSubWorkflowTool } from './tools/failing-sub-workflow.tool.js';
import { RuntimeErrorTool } from './tools/runtime-error.tool.js';
import { StrictSchemaTool } from './tools/strict-schema.tool.js';
import { FailingWorkflow } from './workflows/failing.workflow.js';

@Module({
  imports: [ClaudeModule],
  providers: [StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, FailingWorkflow, DelegateErrorWorkflow],
  exports: [DelegateErrorWorkflow],
})
export class DelegateErrorExampleModule {}
