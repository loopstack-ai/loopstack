import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, ZodValidationPipe } from '@loopstack/common';
import {
  RunWorkflowPayloadInterface,
  RunWorkflowPayloadSchema,
  StartWorkflowPayloadInterface,
  StartWorkflowPayloadSchema,
  WorkflowRunResult,
} from '@loopstack/contracts/api';
import { ProcessorApiService } from '../services/processor-api.service.js';

@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Starts a new workflow by name. The workflow must be declared in a @StudioApp({ workflows }) array.
   */
  @Post('start')
  async startWorkflow(
    @Body(new ZodValidationPipe(StartWorkflowPayloadSchema)) payload: StartWorkflowPayloadInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowRunResult> {
    return this.processorApiService.startWorkflow(payload, user.userId);
  }

  /**
   * Runs a workflow from its current place. When the payload includes a transition,
   * that waiting transition is applied before continuing.
   */
  @Post('run/:workflowId')
  async runWorkflow(
    @Param('workflowId') workflowId: string,
    @Body(new ZodValidationPipe(RunWorkflowPayloadSchema)) payload: RunWorkflowPayloadInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.processorApiService.processWorkflow(workflowId, user.userId, payload ?? {});
  }
}
