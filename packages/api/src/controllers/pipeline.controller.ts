import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { BatchDeleteDto } from '../dtos/batch-delete.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { PipelineCreateDto } from '../dtos/pipeline-create.dto';
import { PipelineFilterDto } from '../dtos/pipeline-filter.dto';
import { PipelineItemDto } from '../dtos/pipeline-item.dto';
import { PipelineSortByDto } from '../dtos/pipeline-sort-by.dto';
import { PipelineUpdateDto } from '../dtos/pipeline-update.dto';
import { PipelineDto } from '../dtos/pipeline.dto';
import { ParseJsonPipe } from '../pipes/parse-json.pipe';
import { PipelineApiService } from '../services/pipeline-api.service';

@ApiTags('api/v1/pipelines')
@ApiExtraModels(PipelineDto, PipelineItemDto, PipelineCreateDto, PipelineUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/pipelines')
export class PipelineController {
  constructor(private readonly pipelineApiService: PipelineApiService) {}

  /**
   * Retrieves all pipelines for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve pipelines with filters, sorting, pagination, and search',
  })
  @ApiExtraModels(PipelineFilterDto, PipelineSortByDto)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    schema: {
      type: 'string',
      example: '[{"field":"createdAt","order":"DESC"}]',
    },
    description: 'JSON string array of PipelineSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    schema: {
      type: 'string',
      example: '{"workspaceId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of PipelineFilterDto object',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter workspaces by title or other searchable fields',
  })
  @ApiPaginatedResponse(PipelineItemDto)
  async getPipelines(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ParseJsonPipe(PipelineFilterDto)) filter: PipelineFilterDto,
    @Query('sortBy', new ParseJsonPipe(PipelineSortByDto)) sortBy: PipelineSortByDto[],
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedDto<PipelineItemDto>> {
    const result = await this.pipelineApiService.findAll(
      user.userId,
      filter,
      sortBy,
      {
        page,
        limit,
      },
      search,
    );
    return PaginatedDto.create(PipelineItemDto, result);
  }

  /**
   * Retrieves a pipeline by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a pipeline by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the pipeline' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiOkResponse({ type: PipelineDto })
  @ApiUnauthorizedResponse()
  async getPipelineById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<PipelineDto> {
    const pipeline = await this.pipelineApiService.findOneById(id, user.userId);
    return PipelineDto.create(pipeline);
  }

  /**
   * Creates a new pipeline.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new pipeline' })
  @ApiBody({ type: PipelineCreateDto, description: 'Pipeline data' })
  @ApiOkResponse({ type: PipelineDto })
  @ApiUnauthorizedResponse()
  async createPipeline(
    @Body() pipelineCreateDto: PipelineCreateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<PipelineDto> {
    const pipeline = await this.pipelineApiService.create(pipelineCreateDto, user.userId);
    return PipelineDto.create(pipeline);
  }

  /**
   * Updates a pipeline by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a pipeline by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the pipeline' })
  @ApiBody({ type: PipelineUpdateDto, description: 'Updated pipeline data' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiOkResponse({ type: PipelineDto })
  @ApiUnauthorizedResponse()
  async updatePipeline(
    @Param('id') id: string,
    @Body() pipelineUpdateDto: PipelineUpdateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<PipelineDto> {
    const pipeline = await this.pipelineApiService.update(id, pipelineUpdateDto, user.userId);
    return PipelineDto.create(pipeline);
  }

  /**
   * Deletes a pipeline by its ID.
   */
  @Delete('id/:id')
  @ApiOperation({ summary: 'Delete a pipeline by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the pipeline' })
  @ApiResponse({ status: 204, description: 'Pipeline deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiUnauthorizedResponse()
  async deletePipeline(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.pipelineApiService.delete(id, user.userId);
  }

  /**
   * Deletes multiple pipelines by their IDs.
   */
  @Delete('batch')
  @ApiOperation({ summary: 'Delete multiple pipelines by IDs' })
  @ApiBody({
    description: 'Array of pipeline IDs to delete',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of pipeline IDs to delete',
          example: ['pipeline-1', 'pipeline-2', 'pipeline-3'],
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch delete completed',
    schema: {
      type: 'object',
      properties: {
        deleted: {
          type: 'array',
          items: { type: 'string' },
          description: 'Successfully deleted pipeline IDs',
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              error: { type: 'string' },
            },
          },
          description: 'Failed deletions with error details',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiUnauthorizedResponse()
  async batchDeletePipelines(
    @Body() batchDeleteDto: BatchDeleteDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return await this.pipelineApiService.batchDelete(batchDeleteDto.ids, user.userId);
  }
}
