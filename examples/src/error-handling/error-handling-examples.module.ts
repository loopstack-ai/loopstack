import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { FlakyServiceTool } from './tools/flaky-service.tool';
import { SlowOperationTool } from './tools/slow-operation.tool';
import { AutoRetryExampleWorkflow } from './workflows/auto-retry/auto-retry-example.workflow';
import { ErrorPlaceExampleWorkflow } from './workflows/error-place/error-place-example.workflow';
import { FailingWorkflow } from './workflows/failing/failing.workflow';
import { ManualRetryExampleWorkflow } from './workflows/manual-retry/manual-retry-example.workflow';
import { RetryTargetExampleWorkflow } from './workflows/retry-target/retry-target-example.workflow';
import { SubWorkflowFailureChildWorkflow } from './workflows/sub-workflow-failure/sub-workflow-failure-child.workflow';
import { SubWorkflowFailureExampleWorkflow } from './workflows/sub-workflow-failure/sub-workflow-failure-example.workflow';
import { TransitionTimeoutExampleWorkflow } from './workflows/transition-timeout/transition-timeout-example.workflow';

const WORKFLOWS = [
  AutoRetryExampleWorkflow,
  RetryTargetExampleWorkflow,
  ErrorPlaceExampleWorkflow,
  ManualRetryExampleWorkflow,
  TransitionTimeoutExampleWorkflow,
  SubWorkflowFailureExampleWorkflow,
  FailingWorkflow,
];

@StudioApp({
  title: 'Error Handling Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [FlakyServiceTool, SlowOperationTool, SubWorkflowFailureChildWorkflow, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class ErrorHandlingExamplesModule {}
