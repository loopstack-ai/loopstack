import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, IsNull, Repository } from 'typeorm';
import { NamespaceEntity } from '@loopstack/common';
import { NamespaceFilterDto } from '../dtos/namespace-filter.dto';
import { NamespaceSortByDto } from '../dtos/namespace-sort-by.dto';

@Injectable()
export class NamespaceApiService {
  constructor(
    @InjectRepository(NamespaceEntity)
    private namespaceRepository: Repository<NamespaceEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * find all namespaces for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string,
    filter: NamespaceFilterDto,
    sortBy: NamespaceSortByDto[],
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
  ): Promise<{
    data: NamespaceEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>('NAMESPACE_DEFAULT_LIMIT', 100);
    const defaultSortBy = this.configService.get<NamespaceSortByDto[]>('NAMESPACE_DEFAULT_SORT_BY', []);

    const transformedFilter = Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [key, value === null ? IsNull() : value]),
    );

    const findOptions: FindManyOptions<NamespaceEntity> = {
      where: {
        createdBy: user,
        ...transformedFilter,
      },
      order: (sortBy ?? defaultSortBy).reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order;
          return acc;
        },
        {} as Record<string, 'ASC' | 'DESC'>,
      ),
      take: pagination.limit ?? defaultLimit,
      skip: pagination.page && pagination.limit ? (pagination.page - 1) * pagination.limit : 0,
    };

    const [data, total] = await this.namespaceRepository.findAndCount(findOptions);

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
  }

  /**
   * Finds a namespace by ID.
   */
  async findOneById(id: string, user: string): Promise<NamespaceEntity> {
    const namespace = await this.namespaceRepository.findOne({
      where: {
        id,
        createdBy: user,
      },
      relations: ['workflows', 'children'],
    });

    if (!namespace) {
      throw new NotFoundException(`Namespace with ID ${id} not found`);
    }
    return namespace;
  }
}
