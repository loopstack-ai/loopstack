import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ErrorRetryWorkflow } from './workflows/error-retry/error-retry-example.workflow';
import { ErrorRetryFailingChildWorkflow } from './workflows/error-retry/failing-child.workflow';
import { SlowTool } from './workflows/error-retry/tools/slow.tool';
import { Step1Tool } from './workflows/error-retry/tools/step1.tool';
import { Step2Tool } from './workflows/error-retry/tools/step2.tool';

const WORKFLOWS = [ErrorRetryWorkflow];

@StudioApp({
  title: 'Error Handling Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [Step1Tool, Step2Tool, SlowTool, ErrorRetryFailingChildWorkflow, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class ErrorHandlingExamplesModule {}
