import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowFilterDto } from '../dtos/workflow-filter.dto';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
export class WorkflowApiService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * find all workflows for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string | null,
    filter: WorkflowFilterDto,
    sortBy: WorkflowSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
  ): Promise<{
    data: WorkflowEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>(
      'WORKFLOW_DEFAULT_LIMIT',
      10,
    );
    const defaultSortBy = this.configService.get<WorkflowSortByDto[]>(
      'WORKFLOW_DEFAULT_SORT_BY',
      [],
    );

    const findOptions: FindManyOptions<WorkflowEntity> = {
      where: {
        createdBy: user === null ? IsNull() : user,
        ...filter,
      },
      order: (sortBy ?? defaultSortBy).reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order;
          return acc;
        },
        {} as Record<string, 'ASC' | 'DESC'>,
      ),
      take: pagination.limit ?? defaultLimit,
      skip:
        pagination.page && pagination.limit
          ? (pagination.page - 1) * pagination.limit
          : 0,
    };

    const [data, total] =
      await this.workflowRepository.findAndCount(findOptions);

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
  }

  /**
   * Finds a workflow by ID.
   */
  async findOneById(id: string, user: string | null): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  /**
   * Deletes a workflow by ID (hard delete).
   */
  async delete(id: string, user: string | null): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!workflow)
      throw new NotFoundException(`Workflow with ID ${id} not found`);

    await this.workflowRepository.delete(id);
  }
}
