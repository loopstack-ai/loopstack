import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { getEntityColumns } from '../utils/get-entity-columns.util';

@Injectable()
export class WorkspaceApiService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * find all workspaces for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string,
    filter: WorkspaceFilterDto,
    sortBy: WorkspaceSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
    search?: string,
  ): Promise<{
    data: WorkspaceEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>('WORKSPACE_DEFAULT_LIMIT', 100);
    const defaultSortBy = this.configService.get<WorkspaceSortByDto[]>('WORKSPACE_DEFAULT_SORT_BY', []);

    const queryBuilder = this.workspaceRepository.createQueryBuilder('workspace');

    const transformedFilter = Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [key, value === null ? IsNull() : value]),
    );

    queryBuilder.where({
      ...transformedFilter,
      createdBy: user,
    });

    if (search) {
      const allowedColumns = getEntityColumns(WorkspaceEntity);
      const searchColumns = ['title', 'blockName'].filter((col) => allowedColumns.includes(col));
      if (searchColumns.length > 0) {
        const searchConditions = searchColumns.map((column) => `workspace.${column} ILIKE :searchQuery`);
        queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
          searchQuery: `%${search}%`,
        });
      }
    }

    const orderBy = (sortBy ?? defaultSortBy).reduce(
      (acc, sort) => {
        acc[`workspace.${sort.field}`] = sort.order;
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
   * Finds a workspace by ID.
   */
  async findOneById(id: string, user: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }
    return workspace;
  }

  /**
   * Creates a new workspace.
   */
  async create(workspaceData: WorkspaceCreateDto, user: string): Promise<WorkspaceEntity> {
    const title = workspaceData.title || `${workspaceData.blockName}`;

    const workspace = this.workspaceRepository.create({
      ...workspaceData,
      title,
      createdBy: user,
    });
    return await this.workspaceRepository.save(workspace);
  }

  /**
   * Updates an existing workspace by ID.
   */
  async update(id: string, workspaceData: WorkspaceUpdateDto, user: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!workspace) throw new NotFoundException(`Workspace with ID ${id} not found`);

    Object.assign(workspace, workspaceData);
    return await this.workspaceRepository.save(workspace);
  }

  /**
   * Deletes a workspace by ID (hard delete).
   */
  async delete(id: string, user: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
    });

    if (!workspace) throw new NotFoundException(`Workspace with ID ${id} not found`);

    await this.workspaceRepository.delete({ id, createdBy: user });
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

    const existingPipelines = await this.workspaceRepository.find({
      where: {
        id: In(ids),
        createdBy: user,
      },
      select: ['id'],
    });

    const existingIds = existingPipelines.map((pipeline) => pipeline.id);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    notFoundIds.forEach((id) => {
      failed.push({
        id,
        error: 'Workspace not found or access denied',
      });
    });

    if (existingIds.length === 0) {
      return { deleted, failed };
    }

    try {
      const deleteResult = await this.workspaceRepository.delete({
        id: In(existingIds),
        createdBy: user,
      });

      // Check if all expected deletions occurred
      if (deleteResult.affected === existingIds.length) {
        deleted.push(...existingIds);
      } else {
        // Handle partial deletion - this is rare but can happen
        // We need to check which ones were actually deleted
        const remainingPipelines = await this.workspaceRepository.find({
          where: {
            id: In(existingIds),
            createdBy: user,
          },
          select: ['id'],
        });

        const remainingIds = remainingPipelines.map((pipeline) => pipeline.id);
        const actuallyDeleted = existingIds.filter((id) => !remainingIds.includes(id));
        const failedToDelete = existingIds.filter((id) => remainingIds.includes(id));

        deleted.push(...actuallyDeleted);
        failedToDelete.forEach((id) => {
          failed.push({
            id,
            error: 'Deletion failed - pipeline may be in use or protected',
          });
        });
      }
    } catch (error) {
      existingIds.forEach((id) => {
        failed.push({
          id,
          error: `Database error: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
    }

    return { deleted, failed };
  }
}
