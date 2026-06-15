import { Module } from '@nestjs/common';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from './run-sub-workflow-example-error-handling.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from './run-sub-workflow-example-failing-sub.workflow';
import { RunSubWorkflowExampleFanOutWorkflow } from './run-sub-workflow-example-fan-out.workflow';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSequenceWorkflow } from './run-sub-workflow-example-sequence.workflow';
import { RunSubWorkflowExampleShowModesWorkflow } from './run-sub-workflow-example-show-modes.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

@Module({
  imports: [],
  providers: [
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleShowModesWorkflow,
    RunSubWorkflowExampleErrorHandlingWorkflow,
    RunSubWorkflowExampleSubWorkflow,
    RunSubWorkflowExampleFailingSubWorkflow,
  ],
  exports: [
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleShowModesWorkflow,
    RunSubWorkflowExampleErrorHandlingWorkflow,
    RunSubWorkflowExampleSubWorkflow,
    RunSubWorkflowExampleFailingSubWorkflow,
  ],
})
export class RunSubWorkflowExampleModule {}
