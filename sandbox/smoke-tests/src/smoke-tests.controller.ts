import { Body, Controller, Post } from '@nestjs/common';
import { ChatWorkflow } from '@loopstack/chat-example-workflow';
import { UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';

/**
 * Example custom controller — demonstrates how to start a workflow
 * from a custom HTTP endpoint without any Studio decorators.
 */
@Controller('smoke-tests')
export class SmokeTestsController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run/chat')
  async runChat(@UserId() userId: string, @Body() payload: WorkflowPayload): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(ChatWorkflow, payload, {
      userId,
      appName: 'smoke_tests',
    });
  }
}
