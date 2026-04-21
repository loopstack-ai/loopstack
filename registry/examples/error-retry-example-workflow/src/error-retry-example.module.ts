import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ErrorRetryWorkflow } from './error-retry.workflow';
import { SlowTool } from './tools/slow.tool';
import { Step1Tool } from './tools/step1.tool';
import { Step2Tool } from './tools/step2.tool';

@Module({
  imports: [LoopCoreModule],
  providers: [Step1Tool, Step2Tool, SlowTool, ErrorRetryWorkflow],
  exports: [ErrorRetryWorkflow],
})
export class ErrorRetryExampleModule {}
