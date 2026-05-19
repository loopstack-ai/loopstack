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
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { BatchDeleteDto } from '../dtos/batch-delete.dto.js';
import { PaginatedDto } from '../dtos/paginated.dto.js';
import { WorkflowCreateDto } from '../dtos/workflow-create.dto.js';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto.js';
import { WorkflowItemDto } from '../dtos/workflow-item.dto.js';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto.js';
import { WorkflowUpdateDto } from '../dtos/workflow-update.dto.js';
import { WorkflowDto } from '../dtos/workflow.dto.js';
import { ParseJsonPipe } from '../pipes/parse-json.pipe.js';
import { WorkflowApiService } from '../services/workflow-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowApiService) {}

  /**
   * Retrieves all workflows for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
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
  async getWorkflowById(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<WorkflowDto> {
    const workflow = await this.workflowService.findOneById(id, user.userId);
    return WorkflowDto.create(workflow);
  }

  /**
   * Creates a new workflow.
   */
  @Post()
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
  async deleteWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.workflowService.delete(id, user.userId);
  }

  /**
   * Deletes multiple workflows by their IDs.
   */
  @Delete('batch')
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
  async getCheckpointHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface) {
    return this.workflowService.getCheckpointHistory(id, user.userId);
  }
}
