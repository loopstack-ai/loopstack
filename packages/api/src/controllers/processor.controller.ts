import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import type { WorkflowRunResult } from '@loopstack/common';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto.js';
import { StartWorkflowPayloadDto } from '../dtos/start-workflow-payload.dto.js';
import { ProcessorApiService } from '../services/processor-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Starts a new workflow by name. The workflow must be declared in a @StudioApp({ workflows }) array.
   */
  @Post('start')
  async startWorkflow(
    @Body() payload: StartWorkflowPayloadDto,
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
    @Body() payload: RunWorkflowPayloadDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.processorApiService.processWorkflow(workflowId, user.userId, payload ?? {});
  }
}
