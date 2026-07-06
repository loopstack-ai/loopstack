import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { WorkflowCheckpointEntity, WorkflowEntity, WorkflowState } from '@loopstack/common';
import type {
  WorkflowCreateInterface,
  WorkflowFilterInterface,
  WorkflowSortByInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';
import { CreateWorkflowService, WorkflowCheckpointService, WorkflowRegistryService } from '@loopstack/core';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';

@Injectable()
export class WorkflowApiService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private configService: ConfigService,
    private workflowCheckpointService: WorkflowCheckpointService,
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly workflowRegistryService: WorkflowRegistryService,
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
      .loadRelationCountAndMap('workflow.hasChildren', 'workflow.children');

    const transformedFilter = Object.fromEntries(
      Object.entries(filter ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, value === null ? IsNull() : value]),
    );

    queryBuilder.where({
      ...transformedFilter,
      createdBy: user,
    });

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

    queryBuilder.take(pagination.limit ?? defaultLimit);
    queryBuilder.skip(pagination.page && pagination.limit ? pagination.page * pagination.limit : 0);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
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
      select: ['id'],
    });

    const existingWorkflowIds = existingWorkflows.map((workflow) => workflow.id);
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
}
