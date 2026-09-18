import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from './workflows/error-handling/error-handling-example.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from './workflows/error-handling/failing-child.workflow';
import { RunSubWorkflowExampleFanOutWorkflow } from './workflows/fan-out/fan-out-example.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './workflows/run/child.workflow';
import { RunSubWorkflowExampleParentWorkflow } from './workflows/run/run-example.workflow';
import { RunSubWorkflowExampleSequenceWorkflow } from './workflows/sequence/sequence-example.workflow';
import { RunSubWorkflowExampleShowModesWorkflow } from './workflows/show-modes/show-modes-example.workflow';

const WORKFLOWS = [
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleShowModesWorkflow,
  RunSubWorkflowExampleErrorHandlingWorkflow,
  RunSubWorkflowExampleFanOutWorkflow,
  RunSubWorkflowExampleSequenceWorkflow,
];

// Children are providers only — they are launched by their parents, not started from the sidebar.
const CHILDREN = [RunSubWorkflowExampleSubWorkflow, RunSubWorkflowExampleFailingSubWorkflow];

@StudioApp({
  title: 'Sub-Workflow Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [...CHILDREN, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class SubWorkflowExamplesModule {}
