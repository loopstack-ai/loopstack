import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { WorkspaceEntity } from '@loopstack/core/dist/persistence/entities/workspace.entity';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { WorkspaceQueryDto } from '../dtos/workspace-query-dto';

@ApiTags('api/v1/workspaces')
@ApiExtraModels(WorkspaceEntity, WorkspaceCreateDto, WorkspaceUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApiService) {}

  /**
   * Retrieves all workspaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the user' })
  @ApiResponse({
    status: 200,
    description: 'Workspaces retrieved successfully',
  })
  async getAllWorkspaces(
    @Query() query: WorkspaceQueryDto,
    @Request() req: ApiRequestType,
  ) {
    const user = req.user || null;
    return this.workspaceService.findAll(user, query);
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
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getWorkspaceById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceEntity> {
    const user = req.user || null;
    return this.workspaceService.findOneById(id, user);
  }

  /**
   * Creates a new workspace.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBody({ type: Object, description: 'Workspace data' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  async createWorkspace(
    @Body() workspaceData: WorkspaceCreateDto,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceEntity> {
    const user = req.user || null;
    return this.workspaceService.create(workspaceData, user);
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
  @ApiBody({ type: Object, description: 'Updated workspace data' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async updateWorkspace(
    @Param('id') id: string,
    @Body() workspaceData: WorkspaceUpdateDto,
    @Request() req: ApiRequestType,
  ): Promise<WorkspaceEntity> {
    const user = req.user || null;
    return this.workspaceService.update(id, workspaceData, user);
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
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async deleteWorkspace(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    const user = req.user || null;
    await this.workspaceService.delete(id, user);
  }
}
