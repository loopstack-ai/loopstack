import { Module } from '@nestjs/common';
import { WorkflowStateWorkflow } from './workflow-state.workflow.js';

@Module({
  providers: [WorkflowStateWorkflow],
  exports: [WorkflowStateWorkflow],
})
export class WorkflowStateExampleModule {}
