import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { DelegateErrorWorkflow } from './delegate-error.workflow';
import { FailingSubWorkflowTool } from './tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './tools/runtime-error.tool';
import { StrictSchemaTool } from './tools/strict-schema.tool';
import { FailingWorkflow } from './workflows/failing.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, FailingWorkflow, DelegateErrorWorkflow],
  exports: [DelegateErrorWorkflow],
})
export class DelegateErrorExampleModule {}
