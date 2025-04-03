import { Injectable, NotFoundException } from '@nestjs/common';
import {IsNull, FindManyOptions, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {NamespaceFilterDto} from "../dtos/namespace-filter.dto";
import {NamespaceSortByDto} from "../dtos/namespace-sort-by.dto";
import { NamespaceEntity } from '@loopstack/core';

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
    user: string | null,
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
    const defaultLimit = this.configService.get<number>(
      'NAMESPACE_DEFAULT_LIMIT',
      10,
    );
    const defaultSortBy = this.configService.get<NamespaceSortByDto[]>(
      'NAMESPACE_DEFAULT_SORT_BY',
      [],
    );

    const findOptions: FindManyOptions<NamespaceEntity> = {
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
      relations: ['workflows']
    };

    const [data, total] =
      await this.namespaceRepository.findAndCount(findOptions);

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
  async findOneById(id: string, user: string | null): Promise<NamespaceEntity> {
    const namespace = await this.namespaceRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
      relations: ['workflows', 'children']
    });

    if (!namespace) {
      throw new NotFoundException(`Namespace with ID ${id} not found`);
    }
    return namespace;
  }
}
