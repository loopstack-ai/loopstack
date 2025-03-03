import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceQueryDto } from '../dtos/workspace-query-dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { WorkspaceDto } from '../dtos/workspace.dto';
import { WorkspaceItemDto } from '../dtos/workspace-item.dto';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto';

@ApiTags('api/v1/workspaces')
@ApiExtraModels(
  WorkspaceDto,
  WorkspaceItemDto,
  WorkspaceCreateDto,
  WorkspaceUpdateDto,
)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApiService) {}

  /**
   * Retrieves all workspaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve workspaces with filters, sorting, and pagination',
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
  @ApiPaginatedResponse(WorkspaceItemDto)
  async getWorkspaces(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<WorkspaceItemDto>> {
    const user = req.user || null;

    let filter: WorkspaceFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as WorkspaceFilterDto;
      } catch (e) {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: WorkspaceSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as WorkspaceSortByDto[];
      } catch (e) {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.workspaceService.findAll(user, filter, sortBy, {
      page,
      limit,
    });
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
  async getWorkspaceById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceDto> {
    const user = req.user || null;
    const workspace = await this.workspaceService.findOneById(id, user);
    return WorkspaceDto.create(workspace);
  }

  /**
   * Creates a new workspace.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBody({ type: WorkspaceCreateDto, description: 'Workspace data' })
  @ApiOkResponse({ type: WorkspaceDto })
  async createWorkspace(
    @Body() workspaceData: WorkspaceCreateDto,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceDto> {
    const user = req.user || null;
    const workspace = await this.workspaceService.create(workspaceData, user);
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
  async updateWorkspace(
    @Param('id') id: string,
    @Body() workspaceData: WorkspaceUpdateDto,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceDto> {
    const user = req.user || null;
    const workspace = await this.workspaceService.update(
      id,
      workspaceData,
      user,
    );
    return WorkspaceDto.create(workspace);
  }

  /**
   * Deletes a workspace by its ID.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workspace by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'The ID of the workspace',
  })
  @ApiResponse({ status: 204, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async deleteWorkspace(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    const user = req.user || null;
    await this.workspaceService.delete(id, user);
  }
}
