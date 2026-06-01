import { Body, Controller, Param, Post } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { BaseWorkflow, StudioController, StudioEndpoint, UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { ResolveWorkflowPipe } from '@loopstack/api';
import {
  DefaultGreetingWorkflow,
  FrenchGreetingWorkflow,
  GermanGreetingWorkflow,
  NestedGreetingWorkflow,
} from '@loopstack/module-config-example';

const WORKFLOWS = [
  DefaultGreetingWorkflow,
  GermanGreetingWorkflow,
  FrenchGreetingWorkflow,
  NestedGreetingWorkflow,
];

@Controller('module-config')
@StudioController()
export class ModuleConfigController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run/:workflowName')
  @StudioEndpoint({ workflows: WORKFLOWS })
  async runWorkflow(
    @UserId() userId: string,
    @Param('workflowName', new ResolveWorkflowPipe(WORKFLOWS))
    workflowClass: Type<BaseWorkflow>,
    @Body() payload: WorkflowPayload,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(workflowClass, payload, {
      userId,
      appName: 'module_config_app',
    });
  }
}
