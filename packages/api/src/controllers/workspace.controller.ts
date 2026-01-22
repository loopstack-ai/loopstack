import {
  BadRequestException,
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
import { CurrentUser, CurrentUserInterface, WorkspaceEntity } from '@loopstack/common';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { PaginatedDto } from '../dtos/paginated.dto';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto';
import { WorkspaceItemDto } from '../dtos/workspace-item.dto';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceDto } from '../dtos/workspace.dto';
import { WorkspaceApiService } from '../services/workspace-api.service';

@ApiTags('api/v1/workspaces')
@ApiExtraModels(WorkspaceDto, WorkspaceItemDto, WorkspaceCreateDto, WorkspaceUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApiService) {}

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
    schema: {
      type: 'string',
      example: '[{"field":"createdAt","order":"DESC"}]',
    },
    description: 'JSON string array of WorkspaceSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
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
  @ApiQuery({
    name: 'searchColumns',
    required: false,
    schema: {
      type: 'string',
      example: '["title","description"]',
    },
    description: 'JSON string array of columns to search in (defaults to title and type if not specified)',
  })
  @ApiPaginatedResponse(WorkspaceItemDto)
  @ApiUnauthorizedResponse()
  async getWorkspaces(
    @CurrentUser() user: CurrentUserInterface,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
    @Query('search') search?: string,
    @Query('searchColumns') searchColumnsParam?: string,
  ): Promise<PaginatedDto<WorkspaceItemDto>> {
    let filter: WorkspaceFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as WorkspaceFilterDto;
      } catch {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: WorkspaceSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as WorkspaceSortByDto[];
      } catch {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    let searchColumns: (keyof WorkspaceEntity)[] = [];
    if (searchColumnsParam) {
      try {
        searchColumns = JSON.parse(searchColumnsParam) as (keyof WorkspaceEntity)[];
      } catch {
        throw new BadRequestException('Invalid searchColumns format');
      }
    }

    const result = await this.workspaceService.findAll(
      user.userId,
      filter,
      sortBy,
      {
        page,
        limit,
      },
      {
        query: search,
        columns: searchColumns,
      },
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
    return WorkspaceDto.create(workspace);
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
    @Body() batchDeleteDto: { ids: string[] },
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return await this.workspaceService.batchDelete(batchDeleteDto.ids, user.userId);
  }
}
