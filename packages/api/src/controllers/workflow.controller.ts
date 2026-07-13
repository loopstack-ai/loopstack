import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, ZodJsonQueryPipe, ZodValidationPipe } from '@loopstack/common';
import {
  BatchDeleteInterface,
  BatchDeleteResultInterface,
  BatchDeleteSchema,
  PaginatedInterface,
  WorkflowCheckpointInterface,
  WorkflowCreateInterface,
  WorkflowCreateSchema,
  WorkflowFilterInterface,
  WorkflowFilterSchema,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowSortByInterface,
  WorkflowStatusInterface,
  WorkflowUpdateInterface,
  WorkflowUpdateSchema,
} from '@loopstack/contracts/api';
import { toPaginated } from '../mappers/paginated.util.js';
import { toWorkflowCheckpoint, toWorkflowFull, toWorkflowItem, toWorkflowStatus } from '../mappers/workflow.mapper.js';
import { WorkflowSortByQuerySchema } from '../schemas/sort-by.schemas.js';
import { WorkflowApiService } from '../services/workflow-api.service.js';

@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowApiService) {}

  /**
   * Retrieves all workflows for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  async getWorkflows(
    @CurrentUser() user: CurrentUserInterface,
    @Query('filter', new ZodJsonQueryPipe(WorkflowFilterSchema)) filter: WorkflowFilterInterface | undefined,
    @Query('sortBy', new ZodJsonQueryPipe(WorkflowSortByQuerySchema)) sortBy: WorkflowSortByInterface[] | undefined,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedInterface<WorkflowItemInterface>> {
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
    return toPaginated(result, toWorkflowItem);
  }

  /**
   * Retrieves a workflow by its ID.
   */
  @Get(':id')
  async getWorkflowById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowFullInterface> {
    const workflow = await this.workflowService.findOneById(id, user.userId);
    return toWorkflowFull(workflow);
  }

  /**
   * Retrieves a slim status projection for a workflow — used by Studio's embedded sub-workflow
   * cards to react to live status changes without pulling the full payload on every SSE tick.
   */
  @Get(':id/status')
  async getWorkflowStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowStatusInterface> {
    const workflow = await this.workflowService.findStatusById(id, user.userId);
    return toWorkflowStatus(workflow);
  }

  /**
   * Creates a new workflow.
   */
  @Post()
  async createWorkflow(
    @Body(new ZodValidationPipe(WorkflowCreateSchema)) payload: WorkflowCreateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowFullInterface> {
    const workflow = await this.workflowService.create(payload, user.userId);
    return toWorkflowFull(workflow);
  }

  /**
   * Updates a workflow by its ID.
   */
  @Put(':id')
  async updateWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(WorkflowUpdateSchema)) payload: WorkflowUpdateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowFullInterface> {
    const workflow = await this.workflowService.update(id, payload, user.userId);
    return toWorkflowFull(workflow);
  }

  /**
   * Deletes a workflow by its ID.
   */
  @Delete('id/:id')
  async deleteWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.workflowService.delete(id, user.userId);
  }

  /**
   * Deletes multiple workflows by their IDs.
   */
  @Delete('batch')
  async batchDeleteWorkflows(
    @Body(new ZodValidationPipe(BatchDeleteSchema)) payload: BatchDeleteInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<BatchDeleteResultInterface> {
    return await this.workflowService.batchDelete(payload.ids, user.userId);
  }

  /**
   * Retrieves the checkpoint history for a workflow.
   */
  @Get(':id/checkpoints')
  async getCheckpointHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkflowCheckpointInterface[]> {
    const checkpoints = await this.workflowService.getCheckpointHistory(id, user.userId);
    return checkpoints.map(toWorkflowCheckpoint);
  }
}
