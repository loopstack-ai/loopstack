import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request, UsePipes, ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels, ApiOkResponse, ApiNoContentResponse,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceQueryDto } from '../dtos/workspace-query-dto';
import { PaginatedDto } from "../dtos/paginated.dto";
import { ApiPaginatedResponse } from "../decorators/api-paginated-response.decorator";
import { WorkspaceDto } from "../dtos/workspace.dto";
import {WorkspaceItemDto} from "../dtos/workspace-item.dto";

@ApiTags('api/v1/workspaces')
@ApiExtraModels(WorkspaceDto, WorkspaceItemDto, WorkspaceCreateDto, WorkspaceUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApiService) {}

  /**
   * Retrieves all workspaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Post('/list')
  @ApiOperation({
    summary: 'Retrieve workspaces with filters, sorting, and pagination',
  })
  @ApiResponse({ status: 200, description: 'Workspaces retrieved successfully' })
  @ApiPaginatedResponse(WorkspaceItemDto)
  async searchWorkspaces(@Body() query: WorkspaceQueryDto, @Request() req: any): Promise<PaginatedDto<WorkspaceItemDto>> {
    const user = req.user || null;
    const result = await this.workspaceService.findAll(user, query);
    return PaginatedDto.create(WorkspaceItemDto, result);
  }

  /**
   * Retrieves a workspace by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workspace' })
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully' })
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
  @ApiBody({ type: Object, description: 'Workspace data' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
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
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workspace' })
  @ApiBody({ type: Object, description: 'Updated workspace data' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiOkResponse({ type: WorkspaceDto })
  async updateWorkspace(
      @Param('id') id: string,
      @Body() workspaceData: WorkspaceUpdateDto,
      @Request() req: ApiRequestType,
  ): Promise<WorkspaceDto> {
    const user = req.user || null;
    const workspace = await this.workspaceService.update(id, workspaceData, user);
    return WorkspaceDto.create(workspace);
  }

  /**
   * Deletes a workspace by its ID.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workspace by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiNoContentResponse()
  async deleteWorkspace(
      @Param('id') id: string,
      @Request() req: ApiRequestType,
  ): Promise<void> {
    const user = req.user || null;
    await this.workspaceService.delete(id, user);
  }
}