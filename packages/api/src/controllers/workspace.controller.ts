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
import { CurrentUser, CurrentUserInterface, getBlockConfig } from '@loopstack/common';
import { WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { BatchDeleteDto } from '../dtos/batch-delete.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { FeaturesDto, VolumeDto } from '../dtos/workspace-config.dto';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto';
import { WorkspaceItemDto } from '../dtos/workspace-item.dto';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceDto } from '../dtos/workspace.dto';
import { ParseJsonPipe } from '../pipes/parse-json.pipe';
import { WorkspaceApiService } from '../services/workspace-api.service';

@ApiTags('api/v1/workspaces')
@ApiExtraModels(WorkspaceDto, WorkspaceItemDto, WorkspaceCreateDto, WorkspaceUpdateDto, VolumeDto, FeaturesDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceApiService,
    private readonly blockDiscoveryService: BlockDiscoveryService,
  ) {}

  /**
   * Retrieves all workspaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve workspaces with filters, sorting, pagination, and search',
  })
  @ApiExtraModels(WorkspaceFilterDto, WorkspaceSortByDto)
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
    description: 'JSON string array of WorkspaceSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    schema: {
      type: 'string',
      example: '{"name":"MyWorkspace"}',
    },
    description: 'JSON string of WorkspaceFilterDto object',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter workspaces by title or other searchable fields',
  })
  @ApiPaginatedResponse(WorkspaceItemDto)
  @ApiUnauthorizedResponse()
  async getWorkspaces(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ParseJsonPipe(WorkspaceFilterDto)) filter: WorkspaceFilterDto,
    @Query('sortBy', new ParseJsonPipe(WorkspaceSortByDto)) sortBy: WorkspaceSortByDto[],
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedDto<WorkspaceItemDto>> {
    const result = await this.workspaceService.findAll(
      user.userId,
      filter,
      sortBy,
      {
        page,
        limit,
      },
      search,
    );
    return PaginatedDto.create(WorkspaceItemDto, result);
  }

  /**
   * Retrieves a workspace by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'The ID of the workspace',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiOkResponse({ type: WorkspaceDto })
  @ApiUnauthorizedResponse()
  async getWorkspaceById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<WorkspaceDto> {
    const workspace = await this.workspaceService.findOneById(id, user.userId);

    let volumes: Record<string, VolumeDto> | undefined;
    let features: FeaturesDto | undefined;

    if (workspace.blockName) {
      const workspaceBlock = this.blockDiscoveryService.getWorkspace(workspace.blockName);
      if (workspaceBlock) {
        const config = getBlockConfig<WorkspaceType>(workspaceBlock) as WorkspaceType;
        if (config) {
          volumes = config.volumes;
          features = config.features;
        }
      }
    }

    const workspaceDto = WorkspaceDto.create(workspace);
    workspaceDto.volumes = volumes;
    workspaceDto.features = features;
    return workspaceDto;
  }

  /**
   * Creates a new workspace.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBody({ type: WorkspaceCreateDto, description: 'Workspace data' })
  @ApiOkResponse({ type: WorkspaceDto })
  @ApiUnauthorizedResponse()
  async createWorkspace(
    @Body() workspaceData: WorkspaceCreateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceDto> {
    const workspace = await this.workspaceService.create(workspaceData, user.userId);
    return WorkspaceDto.create(workspace);
  }

  /**
   * Updates a workspace by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a workspace by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'The ID of the workspace',
  })
  @ApiBody({ type: WorkspaceUpdateDto, description: 'Updated workspace data' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiOkResponse({ type: WorkspaceDto })
  @ApiUnauthorizedResponse()
  async updateWorkspace(
    @Param('id') id: string,
    @Body() workspaceData: WorkspaceUpdateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceDto> {
    const workspace = await this.workspaceService.update(id, workspaceData, user.userId);
    return WorkspaceDto.create(workspace);
  }

  /**
   * Deletes a workspace by its ID.
   */
  @Delete('id/:id')
  @ApiOperation({ summary: 'Delete a workspace by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'The ID of the workspace',
  })
  @ApiResponse({ status: 204, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiUnauthorizedResponse()
  async deleteWorkspace(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.workspaceService.delete(id, user.userId);
  }

  /**
   * Deletes multiple workspaces by their IDs.
   */
  @Delete('batch')
  @ApiOperation({ summary: 'Delete multiple workspaces by IDs' })
  @ApiBody({
    description: 'Array of workspace IDs to delete',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of workspace IDs to delete',
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
          description: 'Successfully deleted workspace IDs',
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
  async batchDeleteWorkspaces(
    @Body() batchDeleteDto: BatchDeleteDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return await this.workspaceService.batchDelete(batchDeleteDto.ids, user.userId);
  }
}
