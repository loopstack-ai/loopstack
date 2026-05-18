import { Module } from '@nestjs/common';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example-parent.workflow.js';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow.js';

@Module({
  imports: [],
  providers: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
  exports: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
})
export class RunSubWorkflowExampleModule {}
