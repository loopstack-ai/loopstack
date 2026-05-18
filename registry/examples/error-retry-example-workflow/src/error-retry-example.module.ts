import { Module } from '@nestjs/common';
import { ErrorRetryWorkflow } from './error-retry.workflow.js';
import { SlowTool } from './tools/slow.tool.js';
import { Step1Tool } from './tools/step1.tool.js';
import { Step2Tool } from './tools/step2.tool.js';

@Module({
  imports: [],
  providers: [Step1Tool, Step2Tool, SlowTool, ErrorRetryWorkflow],
  exports: [ErrorRetryWorkflow],
})
export class ErrorRetryExampleModule {}
