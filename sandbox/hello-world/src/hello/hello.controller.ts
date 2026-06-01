import { Body, Controller, Param, Post } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import {
  BaseWorkflow,
  StudioController,
  StudioEndpoint,
  UserId,
} from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { ResolveWorkflowPipe } from '@loopstack/api';
import { AgentExampleWorkflow } from '@loopstack/agent-example-workflow';
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';
import {
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
} from '@loopstack/run-sub-workflow-example';
import {
  SecretsExampleWorkflow,
  SecretsAgentExampleWorkflow,
} from '@loopstack/secrets-example-workflow';
import { AgentTestWorkflow } from './agent-test.workflow';
import { HelloWorkflow } from './hello.workflow';
import { PromptWorkflow } from './prompt.workflow';

const EXAMPLE_WORKFLOWS = [
  AgentTestWorkflow,
  AgentExampleWorkflow,
  CustomToolExampleWorkflow,
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
  SecretsExampleWorkflow,
  SecretsAgentExampleWorkflow,
];

@Controller('hello')
@StudioController()
export class HelloController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('greet')
  @StudioEndpoint({ title: 'Greeting', workflow: HelloWorkflow })
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
  @StudioEndpoint({ title: 'Simple Prompt', workflow: PromptWorkflow })
  async prompt(
    @UserId() userId: string,
    @Body() payload: WorkflowPayload<{ subject: string }>,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(PromptWorkflow, payload, {
      userId,
      appName: 'hello_app',
    });
  }

  @Post('run/:workflowName')
  @StudioEndpoint({ workflows: EXAMPLE_WORKFLOWS })
  async runWorkflow(
    @UserId() userId: string,
    @Param('workflowName', new ResolveWorkflowPipe(EXAMPLE_WORKFLOWS))
    workflowClass: Type<BaseWorkflow>,
    @Body() payload: WorkflowPayload,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(workflowClass, payload, {
      userId,
      appName: 'hello_app',
    });
  }
}
