import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, Repository, In } from 'typeorm';
import { PipelineCreateDto } from '../dtos/pipeline-create.dto';
import { PipelineUpdateDto } from '../dtos/pipeline-update.dto';
import { ConfigService } from '@nestjs/config';
import { PipelineSortByDto } from '../dtos/pipeline-sort-by.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PipelineFilterDto } from '../dtos/pipeline-filter.dto';
import { PipelineEntity, WorkspaceEntity } from '@loopstack/shared';
import { CreatePipelineService } from '@loopstack/core';

@Injectable()
export class PipelineApiService {
  constructor(
    @InjectRepository(PipelineEntity)
    private pipelineRepository: Repository<PipelineEntity>,
    private configService: ConfigService,
    private readonly createPipelineService: CreatePipelineService,
  ) {}

  /**
   * find all pipelines for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string,
    filter: PipelineFilterDto,
    sortBy: PipelineSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
    search?: {
      query: string | undefined;
      columns: (keyof WorkspaceEntity)[];
    },
  ): Promise<{
    data: PipelineEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>(
      'PIPELINE_DEFAULT_LIMIT',
      100,
    );
    const defaultSortBy = this.configService.get<PipelineSortByDto[]>(
      'PIPELINE_DEFAULT_SORT_BY',
      [],
    );

    const queryBuilder = this.pipelineRepository.createQueryBuilder('pipeline');

    queryBuilder.where({
      createdBy: user,
      ...filter,
    });

    if (search?.query && search.columns?.length > 0) {
      const searchConditions = search.columns.map(
        (column) => `pipeline.${String(column)} ILIKE :searchQuery`,
      );

      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        searchQuery: `%${search.query}%`,
      });
    }

    const orderBy = (sortBy ?? defaultSortBy).reduce(
      (acc, sort) => {
        acc[`pipeline.${sort.field}`] = sort.order;
        return acc;
      },
      {} as Record<string, 'ASC' | 'DESC'>,
    );

    if (Object.keys(orderBy).length > 0) {
      queryBuilder.orderBy(orderBy);
    }

    queryBuilder.take(pagination.limit ?? defaultLimit);
    queryBuilder.skip(
      pagination.page && pagination.limit
        ? pagination.page * pagination.limit
        : 0,
    );

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
  }

  /**
   * Finds a pipeline by ID.
   */
  async findOneById(id: string, user: string): Promise<PipelineEntity> {
    const pipeline = await this.pipelineRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }
    return pipeline;
  }

  /**
   * Creates a new pipeline.
   */
  async create(
    pipelineData: PipelineCreateDto,
    user: string,
  ): Promise<PipelineEntity> {
    try {
      return this.createPipelineService.create({
        id: pipelineData.workspaceId,
      }, pipelineData, user);
    } catch(e) {
      throw new BadRequestException(
        `Pipeline installation failed.`,
      );
    }
  }

  /**
   * Updates an existing pipeline by ID.
   */
  async update(
    id: string,
    pipelineData: PipelineUpdateDto,
    user: string,
  ): Promise<PipelineEntity> {
    const pipeline = await this.pipelineRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!pipeline)
      throw new NotFoundException(`Pipeline with ID ${id} not found`);

    Object.assign(pipeline, pipelineData);
    return await this.pipelineRepository.save(pipeline);
  }

  /**
   * Deletes a pipeline by ID (hard delete).
   */
  async delete(id: string, user: string): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!pipeline)
      throw new NotFoundException(`Pipeline with ID ${id} not found`);

    await this.pipelineRepository.delete(id);
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

    const existingPipelines = await this.pipelineRepository.find({
      where: {
        id: In(ids),
        createdBy: user,
      },
      select: ['id'],
    });

    const existingPipelineIds = existingPipelines.map(
      (pipeline) => pipeline.id,
    );
    const notFoundIds = ids.filter((id) => !existingPipelineIds.includes(id));

    notFoundIds.forEach((id) => {
      failed.push({
        id,
        error: 'Pipeline not found or access denied',
      });
    });

    if (existingPipelineIds.length === 0) {
      return { deleted, failed };
    }

    try {
      const deleteResult = await this.pipelineRepository.delete({
        id: In(existingPipelineIds),
        createdBy: user,
      });

      // Check if all expected deletions occurred
      if (deleteResult.affected === existingPipelineIds.length) {
        deleted.push(...existingPipelineIds);
      } else {
        // Handle partial deletion - this is rare but can happen
        // We need to check which ones were actually deleted
        const remainingPipelines = await this.pipelineRepository.find({
          where: {
            id: In(existingPipelineIds),
            createdBy: user,
          },
          select: ['id'],
        });

        const remainingIds = remainingPipelines.map((pipeline) => pipeline.id);
        const actuallyDeleted = existingPipelineIds.filter(
          (id) => !remainingIds.includes(id),
        );
        const failedToDelete = existingPipelineIds.filter((id) =>
          remainingIds.includes(id),
        );

        deleted.push(...actuallyDeleted);
        failedToDelete.forEach((id) => {
          failed.push({
            id,
            error: 'Deletion failed - pipeline may be in use or protected',
          });
        });
      }
    } catch (error) {
      existingPipelineIds.forEach((id) => {
        failed.push({
          id,
          error: `Database error: ${error.message}`,
        });
      });
    }

    return { deleted, failed };
  }
}
