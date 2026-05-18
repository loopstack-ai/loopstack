import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { CallbackWorkflowPayloadDto } from '../dtos/callback-workflow-payload.dto';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto';
import { ProcessorApiService } from '../services/processor-api.service';

/**
 * Controller handling workflow processor operations
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Executes a workflow processing task
   */
  @Post('run/:workflowId')
  async runWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() payload: RunWorkflowPayloadDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.processorApiService.processWorkflow(workflowId, user.userId, payload ?? {});
  }

  /**
   * Sends a callback to a paused workflow, resuming it at the specified transition
   */
  @Post('callback/:workflowId')
  async callbackWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() body: CallbackWorkflowPayloadDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.processorApiService.callbackWorkflow(workflowId, user.userId, body.payload ?? {}, body.transition);
  }
}
