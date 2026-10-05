import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { FlakyServiceTool } from './tools/flaky-service.tool';
import { SlowOperationTool } from './tools/slow-operation.tool';
import { AutoRetryExampleWorkflow } from './workflows/auto-retry/auto-retry-example.workflow';
import { ErrorPlaceExampleWorkflow } from './workflows/error-place/error-place-example.workflow';
import { ManualRetryExampleWorkflow } from './workflows/manual-retry/manual-retry-example.workflow';
import { RetryTargetExampleWorkflow } from './workflows/retry-target/retry-target-example.workflow';
import { SubWorkflowErrorPlaceChildWorkflow } from './workflows/sub-workflow-error-place/sub-workflow-error-place-child.workflow';
import { SubWorkflowErrorPlaceExampleWorkflow } from './workflows/sub-workflow-error-place/sub-workflow-error-place-example.workflow';
import { TransitionTimeoutExampleWorkflow } from './workflows/transition-timeout/transition-timeout-example.workflow';

const WORKFLOWS = [
  AutoRetryExampleWorkflow,
  RetryTargetExampleWorkflow,
  ErrorPlaceExampleWorkflow,
  ManualRetryExampleWorkflow,
  TransitionTimeoutExampleWorkflow,
  SubWorkflowErrorPlaceExampleWorkflow,
];

@StudioApp({
  title: 'Error Handling Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [FlakyServiceTool, SlowOperationTool, SubWorkflowErrorPlaceChildWorkflow, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class ErrorHandlingExamplesModule {}
