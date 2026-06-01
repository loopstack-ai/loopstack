import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto.js';
import { ProcessorApiService } from '../services/processor-api.service.js';

/**
 * Controller handling workflow processor operations
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

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
