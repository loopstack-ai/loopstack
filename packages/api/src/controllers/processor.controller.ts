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
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';
import { ProcessorApiService } from '../services/processor-api.service';

/**
 * Controller handling pipeline processor operations
 */
@ApiTags('api/v1/processor')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Executes a pipeline processing task
   */
  @Post('run/:pipelineId')
  @ApiOperation({
    summary: 'Run a pipeline',
    description: 'Triggers the processing of a pipeline with the given ID and configuration',
  })
  @ApiParam({
    name: 'pipelineId',
    type: String,
    description: 'The unique identifier of the pipeline to run',
    required: true,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'When true, forces the pipeline to run even if locked',
    example: false,
  })
  @ApiBody({
    type: RunPipelinePayloadDto,
    description: 'Configuration and parameters for the pipeline run',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline successfully started processing',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline not found',
  })
  @ApiUnauthorizedResponse()
  runPipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() payload: RunPipelinePayloadDto,
    @CurrentUser() user: CurrentUserInterface,
  ): void {
    void this.processorApiService.processPipeline(pipelineId, user.userId, payload ?? {});
  }
}
