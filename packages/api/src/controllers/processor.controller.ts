import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { CallbackWorkflowPayloadDto } from '../dtos/callback-workflow-payload.dto';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto';
import { ProcessorApiService } from '../services/processor-api.service';

/**
 * Controller handling workflow processor operations
 */
@ApiTags('api/v1/processor')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Executes a workflow processing task
   */
  @Post('run/:workflowId')
  @ApiOperation({
    summary: 'Run a workflow',
    description: 'Triggers the processing of a workflow with the given ID and configuration',
  })
  @ApiParam({
    name: 'workflowId',
    type: String,
    description: 'The unique identifier of the workflow to run',
    required: true,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'When true, forces the workflow to run even if locked',
    example: false,
  })
  @ApiBody({
    type: RunWorkflowPayloadDto,
    description: 'Configuration and parameters for the workflow run',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow successfully started processing',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found',
  })
  @ApiUnauthorizedResponse()
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
  @ApiOperation({
    summary: 'Callback a workflow',
    description: 'Resumes a paused workflow by triggering the specified transition with an optional payload',
  })
  @ApiParam({
    name: 'workflowId',
    type: String,
    description: 'The unique identifier of the workflow to callback',
    required: true,
  })
  @ApiBody({
    type: CallbackWorkflowPayloadDto,
    description: 'Transition name and optional payload for the callback',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Callback successfully scheduled',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found',
  })
  @ApiUnauthorizedResponse()
  async callbackWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() body: CallbackWorkflowPayloadDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.processorApiService.callbackWorkflow(workflowId, user.userId, body.payload ?? {}, body.transition);
  }
}
