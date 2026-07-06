import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, ZodJsonQueryPipe, ZodValidationPipe } from '@loopstack/common';
import {
  BatchDeleteInterface,
  BatchDeleteResultInterface,
  BatchDeleteSchema,
  PaginatedInterface,
  WorkspaceCreateInterface,
  WorkspaceCreateSchema,
  WorkspaceFavouriteInterface,
  WorkspaceFavouriteSchema,
  WorkspaceFilterInterface,
  WorkspaceFilterSchema,
  WorkspaceInterface,
  WorkspaceSortByInterface,
  WorkspaceUpdateInterface,
  WorkspaceUpdateSchema,
} from '@loopstack/contracts/api';
import { toPaginated } from '../mappers/paginated.util.js';
import { toWorkspace } from '../mappers/workspace.mapper.js';
import { WorkspaceSortByQuerySchema } from '../schemas/sort-by.schemas.js';
import { WorkspaceApiService } from '../services/workspace-api.service.js';

@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceApiService) {}

  /**
   * Retrieves all workspaces for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  async getWorkspaces(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ZodJsonQueryPipe(WorkspaceFilterSchema)) filter: WorkspaceFilterInterface | undefined,
    @Query('sortBy', new ZodJsonQueryPipe(WorkspaceSortByQuerySchema)) sortBy: WorkspaceSortByInterface[] | undefined,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedInterface<WorkspaceInterface>> {
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
    return toPaginated(result, toWorkspace);
  }

  /**
   * Retrieves a workspace by its ID.
   */
  @Get(':id')
  async getWorkspaceById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceInterface> {
    const workspace = await this.workspaceService.findOneById(id, user.userId);
    return toWorkspace(workspace);
  }

  /**
   * Creates a new workspace.
   */
  @Post()
  async createWorkspace(
    @Body(new ZodValidationPipe(WorkspaceCreateSchema)) payload: WorkspaceCreateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceInterface> {
    const workspace = await this.workspaceService.create(payload, user.userId);
    return toWorkspace(workspace);
  }

  /**
   * Updates a workspace by its ID.
   */
  @Put(':id')
  async updateWorkspace(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(WorkspaceUpdateSchema)) payload: WorkspaceUpdateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceInterface> {
    const workspace = await this.workspaceService.update(id, payload, user.userId);
    return toWorkspace(workspace);
  }

  /**
   * Sets the favourite status of a workspace.
   */
  @Patch(':id/favourite')
  async setFavourite(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(WorkspaceFavouriteSchema)) payload: WorkspaceFavouriteInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceInterface> {
    const workspace = await this.workspaceService.setFavourite(id, payload.isFavourite, user.userId);
    return toWorkspace(workspace);
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
    @Body(new ZodValidationPipe(BatchDeleteSchema)) payload: BatchDeleteInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<BatchDeleteResultInterface> {
    return await this.workspaceService.batchDelete(payload.ids, user.userId);
  }
}
