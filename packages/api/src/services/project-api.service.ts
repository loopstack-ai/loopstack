import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { ProjectUpdateDto } from '../dtos/project-update.dto';
import { ConfigService } from '@nestjs/config';
import { ProjectSortByDto } from '../dtos/project-sort-by.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { ProjectEntity, WorkspaceEntity } from '@loopstack/shared';

@Injectable()
export class ProjectApiService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * find all projects for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string | null,
    filter: ProjectFilterDto,
    sortBy: ProjectSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
    search?: {
      query: string | undefined;
      columns: (keyof WorkspaceEntity)[];
    },
  ): Promise<{
    data: ProjectEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>(
      'PROJECT_DEFAULT_LIMIT',
      100,
    );
    const defaultSortBy = this.configService.get<ProjectSortByDto[]>(
      'PROJECT_DEFAULT_SORT_BY',
      [],
    );

    const queryBuilder = this.projectRepository.createQueryBuilder('project');

    queryBuilder.where({
      createdBy: user === null ? IsNull() : user,
      ...filter,
    });

    if (search?.query && search.columns?.length > 0) {
      const searchConditions = search.columns.map(column =>
        `project.${String(column)} ILIKE :searchQuery`
      );

      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        searchQuery: `%${search.query}%`,
      });
    }

    const orderBy = (sortBy ?? defaultSortBy).reduce(
      (acc, sort) => {
        acc[`project.${sort.field}`] = sort.order;
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
        : 0
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
   * Finds a project by ID.
   */
  async findOneById(id: string, user: string | null): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  /**
   * Creates a new project.
   */
  async create(
    projectData: ProjectCreateDto,
    user: string | null,
  ): Promise<ProjectEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id: projectData.workspaceId,
        createdBy: user === null ? IsNull() : user,
      },
    });
    if (!workspace) {
      throw new NotFoundException(
        `Workspace with id ${projectData.workspaceId} not found.`,
      );
    }

    const project = this.projectRepository.create({
      ...projectData,
      createdBy: user,
      workspace,
    });
    return await this.projectRepository.save(project);
  }

  /**
   * Updates an existing project by ID.
   */
  async update(
    id: string,
    projectData: ProjectUpdateDto,
    user: string | null,
  ): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!project)
      throw new NotFoundException(`Project with ID ${id} not found`);

    Object.assign(project, projectData);
    return await this.projectRepository.save(project);
  }

  /**
   * Deletes a project by ID (hard delete).
   */
  async delete(id: string, user: string | null): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!project)
      throw new NotFoundException(`Project with ID ${id} not found`);

    await this.projectRepository.delete(id);
  }
}
