import { Body, Controller, Param, Post, Query, Request } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { ProjectEntity } from '@loopstack/core';
import { ProcessorApiService } from '../services/processor-api.service';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { RunProjectPayloadDto } from '../dtos/run-project-payload.dto';

/**
 * Query parameters for run project endpoint
 */
export class RunProjectQueryParams {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force?: boolean;
}

/**
 * Controller handling project processor operations
 */
@ApiTags('Project Processor')
@Controller('api/v1/processor')
export class ProcessorController {
  constructor(private readonly processorApiService: ProcessorApiService) {}

  /**
   * Executes a project processing task
   */
  @Post('run/:projectId')
  @ApiOperation({
    summary: 'Run a project',
    description:
      'Triggers the processing of a project with the given ID and configuration',
  })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'The unique identifier of the project to run',
    required: true,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'When true, forces the project to run even if locked',
    example: false,
  })
  @ApiBody({
    type: RunProjectPayloadDto,
    description: 'Configuration and parameters for the project run',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Project successfully started processing',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async runProject(
    @Param('projectId') projectId: string,
    @Body() payload: RunProjectPayloadDto,
    @Request() req: ApiRequestType,
    @Query() queryParams: RunProjectQueryParams,
  ): Promise<ProjectEntity> {
    const user = req.user || null;
    return this.processorApiService.processProject(projectId, user, payload, {
      force: !!queryParams.force,
    });
  }
}
