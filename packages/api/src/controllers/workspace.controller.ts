import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, getBlockConfig } from '@loopstack/common';
import { AppType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { BatchDeleteDto } from '../dtos/batch-delete.dto.js';
import { PaginatedDto } from '../dtos/paginated.dto.js';
import { FeaturesDto } from '../dtos/workspace-config.dto.js';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto.js';
import { WorkspaceFavouriteDto } from '../dtos/workspace-favourite.dto.js';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto.js';
import { WorkspaceItemDto } from '../dtos/workspace-item.dto.js';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto.js';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto.js';
import { WorkspaceDto } from '../dtos/workspace.dto.js';
import { ParseJsonPipe } from '../pipes/parse-json.pipe.js';
import { WorkspaceApiService } from '../services/workspace-api.service.js';

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
  async getWorkspaceById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<WorkspaceDto> {
    const workspace = await this.workspaceService.findOneById(id, user.userId);

    let features: FeaturesDto | undefined;

    if (workspace.className) {
      const appBlock = this.blockDiscoveryService.getApp(workspace.className);
      if (appBlock) {
        const config = getBlockConfig<AppType>(appBlock) as AppType;
        if (config) {
          features = config.features;
        }
      }
    }

    const workspaceDto = WorkspaceDto.create(workspace);
    workspaceDto.features = features;
    return workspaceDto;
  }

  /**
   * Creates a new workspace.
   */
  @Post()
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
  async updateWorkspace(
    @Param('id') id: string,
    @Body() workspaceData: WorkspaceUpdateDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceDto> {
    const workspace = await this.workspaceService.update(id, workspaceData, user.userId);
    return WorkspaceDto.create(workspace);
  }

  /**
   * Sets the favourite status of a workspace.
   */
  @Patch(':id/favourite')
  async setFavourite(
    @Param('id') id: string,
    @Body() body: WorkspaceFavouriteDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceItemDto> {
    const workspace = await this.workspaceService.setFavourite(id, body.isFavourite, user.userId);
    return WorkspaceItemDto.create(workspace);
  }

  /**
   * Deletes a workspace by its ID.
   */
  @Delete('id/:id')
  async deleteWorkspace(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.workspaceService.delete(id, user.userId);
  }

  /**
   * Deletes multiple workspaces by their IDs.
   */
  @Delete('batch')
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
