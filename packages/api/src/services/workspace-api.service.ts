import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { WorkspaceCreateDto } from '../dtos/workspace-create.dto';
import { WorkspaceUpdateDto } from '../dtos/workspace-update.dto';
import { WorkspaceEntity } from '@loopstack/core';
import { ConfigService } from '@nestjs/config';
import { WorkspaceSortByDto } from '../dtos/workspace-sort-by.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceFilterDto } from '../dtos/workspace-filter.dto';

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
    user: string | null,
    filter: WorkspaceFilterDto,
    sortBy: WorkspaceSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
  ): Promise<{
    data: WorkspaceEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>(
      'WORKSPACE_DEFAULT_LIMIT',
      10,
    );
    const defaultSortBy = this.configService.get<WorkspaceSortByDto[]>(
      'WORKSPACE_DEFAULT_SORT_BY',
      [],
    );

    const findOptions: FindManyOptions<WorkspaceEntity> = {
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
      await this.workspaceRepository.findAndCount(findOptions);

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
  async findOneById(id: string, user: string | null): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
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
  async create(
    workspaceData: WorkspaceCreateDto,
    user: string | null,
  ): Promise<WorkspaceEntity> {
    const workspace = this.workspaceRepository.create({
      ...workspaceData,
      createdBy: user,
    });
    return await this.workspaceRepository.save(workspace);
  }

  /**
   * Updates an existing workspace by ID.
   */
  async update(
    id: string,
    workspaceData: WorkspaceUpdateDto,
    user: string | null,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!workspace)
      throw new NotFoundException(`Workspace with ID ${id} not found`);

    Object.assign(workspace, workspaceData);
    return await this.workspaceRepository.save(workspace);
  }

  /**
   * Deletes a workspace by ID (hard delete).
   */
  async delete(id: string, user: string | null): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!workspace)
      throw new NotFoundException(`Workspace with ID ${id} not found`);

    await this.workspaceRepository.delete(id);
  }
}
