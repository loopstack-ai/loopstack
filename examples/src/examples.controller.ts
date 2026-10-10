import { Body, Controller, Post } from '@nestjs/common';
import { UserId } from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { PromptExampleWorkflow } from './llm/workflows/prompt/prompt-example.workflow';

/**
 * Example custom controller — demonstrates how to start a workflow
 * from a custom HTTP endpoint without any Studio decorators.
 */
@Controller('examples')
export class ExamplesController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run/prompt')
  async runPrompt(@UserId() userId: string, @Body() payload: WorkflowPayload): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(PromptExampleWorkflow, payload, {
      userId,
      appName: 'examples',
    });
  }
}
