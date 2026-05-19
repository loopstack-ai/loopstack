import { Module } from '@nestjs/common';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

@Module({
  imports: [],
  providers: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
  exports: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
})
export class RunSubWorkflowExampleModule {}
