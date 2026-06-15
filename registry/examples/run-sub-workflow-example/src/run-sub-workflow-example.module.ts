import { Module } from '@nestjs/common';
import { RunSubWorkflowExampleFanOutWorkflow } from './run-sub-workflow-example-fan-out.workflow';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSequenceWorkflow } from './run-sub-workflow-example-sequence.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

@Module({
  imports: [],
  providers: [
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleSubWorkflow,
  ],
  exports: [
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleSubWorkflow,
  ],
})
export class RunSubWorkflowExampleModule {}
