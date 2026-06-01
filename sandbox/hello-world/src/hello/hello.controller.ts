import { Body, Controller, Post } from '@nestjs/common';
import { UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { HelloWorkflow } from './hello.workflow';
import { PromptWorkflow } from './prompt.workflow';

@Controller('hello')
export class HelloController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('greet')
  async greet(
    @UserId() userId: string,
    @Body() payload: WorkflowPayload<{ name: string }>,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(HelloWorkflow, payload, {
      userId,
      appName: 'hello_app',
    });
  }

  @Post('prompt')
  async prompt(
    @UserId() userId: string,
    @Body() payload: WorkflowPayload<{ subject: string }>,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(PromptWorkflow, payload, {
      userId,
      appName: 'hello_app',
    });
  }
}
