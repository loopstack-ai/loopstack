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
import { WorkflowCreateDto } from '../dtos/workflow-create.dto';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto';
import { WorkflowItemDto } from '../dtos/workflow-item.dto';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';
import { WorkflowUpdateDto } from '../dtos/workflow-update.dto';
import { WorkflowDto } from '../dtos/workflow.dto';
import { ParseJsonPipe } from '../pipes/parse-json.pipe';
import { WorkflowApiService } from '../services/workflow-api.service';

@ApiTags('api/v1/workflows')
@ApiExtraModels(WorkflowDto, WorkflowItemDto, WorkflowCreateDto, WorkflowUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowApiService) {}

  /**
   * Retrieves all workflows for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve workflows with filters, sorting, pagination, and search',
  })
  @ApiExtraModels(WorkflowFilterDto, WorkflowSortByDto)
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
    description: 'JSON string array of WorkflowSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    schema: {
      type: 'string',
      example: '{"workspaceId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of WorkflowFilterDto object',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter workflows by title or other searchable fields',
  })
  @ApiPaginatedResponse(WorkflowItemDto)
  @ApiUnauthorizedResponse()
  async getWorkflows(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ParseJsonPipe(WorkflowFilterDto)) filter: WorkflowFilterDto,
    @Query('sortBy', new ParseJsonPipe(WorkflowSortByDto)) sortBy: WorkflowSortByDto[],
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedDto<WorkflowItemDto>> {
    const result = await this.workflowService.findAll(
      user.userId,
      filter,
      sortBy,
      {
        page,
        limit,
      },
      search,
    );
    return PaginatedDto.create(WorkflowItemDto, result);
  }

  /**
   * Retrieves a workflow by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiOkResponse({ type: WorkflowDto })
  @ApiUnauthorizedResponse()
  async getWorkflowById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<WorkflowDto> {
    const workflow = await this.workflowService.findOneById(id, user.userId);
    return WorkflowDto.create(workflow);
  }

  /**
   * Creates a new workflow.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiBody({ type: WorkflowCreateDto, description: 'Workflow data' })
  @ApiOkResponse({ type: WorkflowDto })
  @ApiUnauthorizedResponse()
  async createWorkflow(
    @Body() workflowCreateDto: WorkflowCreateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowService.create(workflowCreateDto, user.userId);
    return WorkflowDto.create(workflow);
  }

  /**
   * Updates a workflow by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a workflow by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiBody({ type: WorkflowUpdateDto, description: 'Updated workflow data' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiOkResponse({ type: WorkflowDto })
  @ApiUnauthorizedResponse()
  async updateWorkflow(
    @Param('id') id: string,
    @Body() workflowUpdateDto: WorkflowUpdateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowService.update(id, workflowUpdateDto, user.userId);
    return WorkflowDto.create(workflow);
  }

  /**
   * Deletes a workflow by its ID.
   */
  @Delete('id/:id')
  @ApiOperation({ summary: 'Delete a workflow by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiUnauthorizedResponse()
  async deleteWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.workflowService.delete(id, user.userId);
  }

  /**
   * Deletes multiple workflows by their IDs.
   */
  @Delete('batch')
  @ApiOperation({ summary: 'Delete multiple workflows by IDs' })
  @ApiBody({
    description: 'Array of workflow IDs to delete',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of workflow IDs to delete',
          example: ['workflow-1', 'workflow-2', 'workflow-3'],
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
          description: 'Successfully deleted workflow IDs',
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
  async batchDeleteWorkflows(
    @Body() batchDeleteDto: BatchDeleteDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return await this.workflowService.batchDelete(batchDeleteDto.ids, user.userId);
  }

  /**
   * Retrieves the checkpoint history for a workflow.
   */
  @Get(':id/checkpoints')
  @ApiOperation({ summary: 'Get checkpoint history for a workflow' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workflow' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiOkResponse({ description: 'List of checkpoints (lightweight: place, transition, version, timestamp)' })
  @ApiUnauthorizedResponse()
  async getCheckpointHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface) {
    return this.workflowService.getCheckpointHistory(id, user.userId);
  }
}
