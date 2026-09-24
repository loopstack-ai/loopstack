import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { RunTraceEventEntity, WorkflowCheckpointEntity, WorkflowEntity, WorkflowState } from '@loopstack/common';
import type {
  WorkflowCreateInterface,
  WorkflowFilterInterface,
  WorkflowSortByInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';
import {
  CreateWorkflowService,
  RunTraceService,
  WorkflowCheckpointService,
  WorkflowRegistryService,
} from '@loopstack/core';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';
import { resolvePagination } from '../utils/pagination.util.js';

@Injectable()
export class WorkflowApiService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private configService: ConfigService,
    private workflowCheckpointService: WorkflowCheckpointService,
    private readonly runTraceService: RunTraceService,
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * find all workflows for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string,
    filter: WorkflowFilterInterface | undefined,
    sortBy: WorkflowSortByInterface[] | undefined,
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
    search?: string,
  ): Promise<{
    data: WorkflowEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>('WORKFLOW_DEFAULT_LIMIT', 100);
    const defaultSortBy = this.configService.get<WorkflowSortByInterface[]>('WORKFLOW_DEFAULT_SORT_BY', []);

    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .loadRelationCountAndMap('workflow.hasChildren', 'workflow.children')
      // What a `waiting` run is waiting ON: with active children it is waiting on machinery, without them
      // it is waiting on a person. The status alone cannot tell those apart — every parked run carries it.
      .loadRelationCountAndMap('workflow.activeChildren', 'workflow.children', 'activeChild', (qb) =>
        qb.where('activeChild.status IN (:...activeStates)', {
          activeStates: [WorkflowState.Running, WorkflowState.Waiting, WorkflowState.Pending],
        }),
      );

    // `topLevel` is a question about the workspace, not a column, so it is applied separately below.
    const { topLevel, ...columnFilter } = filter ?? {};
    const transformedFilter = Object.fromEntries(
      Object.entries(columnFilter)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, value === null ? IsNull() : value]),
    );

    queryBuilder.where({
      ...transformedFilter,
      createdBy: user,
    });

    if (topLevel) {
      // A run queued into this workspace from another one is top-level here: its parent is somewhere the
      // viewer is not looking, so this workspace is the only place anyone would find it.
      if (columnFilter.workspaceId) {
        queryBuilder
          .leftJoin('workflow.parent', 'parent')
          .andWhere('(workflow.parent_id IS NULL OR parent.workspace_id != :topLevelWorkspaceId)', {
            topLevelWorkspaceId: columnFilter.workspaceId,
          });
      } else {
        queryBuilder.andWhere('workflow.parent_id IS NULL');
      }
    }

    if (search) {
      const allowedColumns = getEntityColumns(WorkflowEntity);
      const searchColumns = ['title', 'workflowName'].filter((col) => allowedColumns.includes(col));
      if (searchColumns.length > 0) {
        const searchConditions = searchColumns.map((column) => `workflow.${column} ILIKE :searchQuery`);
        queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
          searchQuery: `%${search}%`,
        });
      }
    }

    const orderBy = (sortBy ?? defaultSortBy).reduce(
      (acc, sort) => {
        acc[`workflow.${sort.field}`] = sort.order;
        return acc;
      },
      {} as Record<string, 'ASC' | 'DESC'>,
    );

    if (Object.keys(orderBy).length > 0) {
      queryBuilder.orderBy(orderBy);
    }

    const { skip, take, page, limit } = resolvePagination(pagination, defaultLimit);
    queryBuilder.take(take);
    queryBuilder.skip(skip);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Finds a minimal status projection for a workflow by ID — used by Studio's embedded link cards
   * to react to live workflow state changes without pulling args/context/transitions.
   */
  async findStatusById(
    id: string,
    user: string,
  ): Promise<Pick<WorkflowEntity, 'id' | 'status' | 'hasError' | 'errorMessage'>> {
    const workflow = await this.workflowRepository
      .createQueryBuilder('workflow')
      .select(['workflow.id', 'workflow.status', 'workflow.hasError', 'workflow.errorMessage'])
      .where({ id, createdBy: user })
      .getOne();

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  /**
   * Finds a workflow by ID.
   */
  async findOneById(id: string, user: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository
      .createQueryBuilder('workflow')
      .loadRelationCountAndMap('workflow.hasChildren', 'workflow.children')
      .where({ id, createdBy: user })
      .getOne();

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  /**
   * Creates a new workflow.
   */
  async create(workflowData: WorkflowCreateInterface, user: string): Promise<WorkflowEntity> {
    try {
      const { instance } = this.workflowRegistryService.resolve(workflowData.workflowName);
      return this.createWorkflowService.create(
        instance,
        {
          id: workflowData.workspaceId,
        },
        {
          ...workflowData,
          title: workflowData.title ?? undefined,
        } as Partial<WorkflowEntity>,
        user,
      );
    } catch {
      throw new BadRequestException(`Workflow creation failed.`);
    }
  }

  /**
   * Updates an existing workflow by ID.
   */
  async update(id: string, workflowData: WorkflowUpdateInterface, user: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!workflow) throw new NotFoundException(`Workflow with ID ${id} not found`);

    Object.assign(workflow, workflowData);
    return await this.workflowRepository.save(workflow);
  }

  /**
   * Deletes a workflow by ID (hard delete).
   */
  async delete(id: string, user: string): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!workflow) throw new NotFoundException(`Workflow with ID ${id} not found`);

    await this.workflowRepository.delete({ id, createdBy: user });
    // In-process domain event so the host app can release resources it holds for this run (checkout
    // dirs, containers, volumes, …). Emitted once per deleted workflow, after the delete committed.
    this.eventEmitter.emit('workflow.deleted', { id, workspaceId: workflow.workspaceId, user });
  }

  async setStatus(id: string, user: string, status: WorkflowState): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: { id, createdBy: user },
    });

    if (!workflow) throw new NotFoundException(`Workflow with ID ${id} not found`);

    workflow.status = status;
    await this.workflowRepository.save(workflow);
  }

  async batchDelete(
    ids: string[],
    user: string,
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    if (!ids || ids.length === 0) {
      return { deleted, failed };
    }

    const existingWorkflows = await this.workflowRepository.find({
      where: {
        id: In(ids),
        createdBy: user,
      },
      // workspaceId rides along for the `workflow.deleted` events emitted below.
      select: ['id', 'workspaceId'],
    });

    const existingWorkflowIds = existingWorkflows.map((workflow) => workflow.id);
    const workspaceByWorkflowId = new Map(existingWorkflows.map((workflow) => [workflow.id, workflow.workspaceId]));
    const notFoundIds = ids.filter((id) => !existingWorkflowIds.includes(id));

    notFoundIds.forEach((id) => {
      failed.push({
        id,
        error: 'Workflow not found or access denied',
      });
    });

    if (existingWorkflowIds.length === 0) {
      return { deleted, failed };
    }

    try {
      const deleteResult = await this.workflowRepository.delete({
        id: In(existingWorkflowIds),
        createdBy: user,
      });

      // Check if all expected deletions occurred
      if (deleteResult.affected === existingWorkflowIds.length) {
        deleted.push(...existingWorkflowIds);
      } else {
        // Handle partial deletion - this is rare but can happen
        // We need to check which ones were actually deleted
        const remainingWorkflows = await this.workflowRepository.find({
          where: {
            id: In(existingWorkflowIds),
            createdBy: user,
          },
          select: ['id'],
        });

        const remainingIds = remainingWorkflows.map((workflow) => workflow.id);
        const actuallyDeleted = existingWorkflowIds.filter((id) => !remainingIds.includes(id));
        const failedToDelete = existingWorkflowIds.filter((id) => remainingIds.includes(id));

        deleted.push(...actuallyDeleted);
        failedToDelete.forEach((id) => {
          failed.push({
            id,
            error: 'Deletion failed - workflow may be in use or protected',
          });
        });
      }
    } catch (error) {
      existingWorkflowIds.forEach((id) => {
        failed.push({
          id,
          error: `Database error: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
    }

    // One `workflow.deleted` per actually-deleted run (see `delete` for the event contract).
    deleted.forEach((id) =>
      this.eventEmitter.emit('workflow.deleted', { id, workspaceId: workspaceByWorkflowId.get(id), user }),
    );

    return { deleted, failed };
  }

  async getCheckpointHistory(
    workflowId: string,
    user: string,
  ): Promise<
    Pick<WorkflowCheckpointEntity, 'id' | 'place' | 'transitionId' | 'transitionFrom' | 'version' | 'createdAt'>[]
  > {
    // Verify the user owns this workflow
    await this.findOneById(workflowId, user);
    return this.workflowCheckpointService.getHistory(workflowId);
  }

  async getToolCalls(workflowId: string, user: string): Promise<RunTraceEventEntity[]> {
    // Verify the user owns this workflow
    await this.findOneById(workflowId, user);
    // Tool events of the whole run tree — a parent run's fixture needs its sub-workflows' calls too.
    return this.runTraceService.findByRunTree(workflowId, ['tool.completed']);
  }
}
