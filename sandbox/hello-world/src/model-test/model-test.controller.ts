import { Body, Controller, Post } from '@nestjs/common';
import { StudioController, StudioEndpoint, UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { ModelTestWorkflow } from './model-test.workflow';

@Controller('model-test')
@StudioController()
export class ModelTestController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run')
  @StudioEndpoint({ title: 'Model Test (Opus)', workflow: ModelTestWorkflow })
  async run(
    @UserId() userId: string,
    @Body() payload: WorkflowPayload<{ subject: string }>,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(ModelTestWorkflow, payload, {
      userId,
      appName: 'model_test_app',
    });
  }
}
