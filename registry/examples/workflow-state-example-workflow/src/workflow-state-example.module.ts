import { Module } from '@nestjs/common';
import { WorkflowStateWorkflow } from './workflow-state.workflow';

@Module({
  providers: [WorkflowStateWorkflow],
  exports: [WorkflowStateWorkflow],
})
export class WorkflowStateExampleModule {}
