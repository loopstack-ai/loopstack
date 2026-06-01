import { Body, Controller, Post } from '@nestjs/common';
import { UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { DefaultGreetingWorkflow } from '@loopstack/module-config-example';

@Controller('module-config')
export class ModuleConfigController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run')
  async runWorkflow(
    @UserId() userId: string,
    @Body() payload: WorkflowPayload,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(DefaultGreetingWorkflow, payload, {
      userId,
      appName: 'module_config_app',
    });
  }
}
