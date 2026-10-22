import { Body, Controller, Post } from '@nestjs/common';
import { UserId } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../scheduling-examples.constants';
import { DirectRunArgsSchema, DirectRunWorkflow } from './direct-run.workflow';

interface DirectRunBody {
  text?: string;
}

/**
 * The base case of every trigger: a plain controller calls WorkflowRunner and reads what comes back.
 * The request is authenticated, so the user comes from the request with @UserId().
 */
@Controller('scheduling-examples')
export class DirectRunController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('direct-run')
  async run(@UserId() userId: string, @Body() body: DirectRunBody) {
    const args = DirectRunArgsSchema.parse(body ?? {});
    const { workflowId, status, result } = await this.workflowRunner.runSync(DirectRunWorkflow, args, {
      appName: SCHEDULING_EXAMPLES_APP,
      userId,
    });
    return { workflowId, status, result };
  }
}
