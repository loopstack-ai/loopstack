import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { DocumentEntity } from '@loopstack/common';
import type { DocumentFilterInterface, DocumentSortByInterface } from '@loopstack/contracts/api';
import { resolvePagination } from '../utils/pagination.util.js';

/**
 * Translate the document filter into a TypeORM `where`. Most fields match by equality (`null` meaning
 * IS NULL); `updatedAfter` and `beforeIndex` are range filters — they let a client hold a window of a run
 * and ask only for what changed since, or for the page before it.
 */
export function buildDocumentWhere(filter: DocumentFilterInterface | undefined): Record<string, unknown> {
  const { updatedAfter, beforeIndex, ...equality } = filter ?? {};
  return {
    ...Object.fromEntries(Object.entries(equality).map(([key, value]) => [key, value === null ? IsNull() : value])),
    ...(updatedAfter ? { updatedAt: MoreThan(new Date(updatedAfter)) } : {}),
    ...(beforeIndex !== undefined ? { index: LessThan(beforeIndex) } : {}),
  };
}

@Injectable()
export class DocumentApiService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * find all documents for the user with optional filters, sorting, and pagination.
   */
  async findAll(
    user: string,
    filter: DocumentFilterInterface | undefined,
    sortBy: DocumentSortByInterface[] | undefined,
    pagination: {
      page: number | undefined;
      limit: number | undefined;
    },
  ): Promise<{
    data: DocumentEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const defaultLimit = this.configService.get<number>('DOCUMENT_DEFAULT_LIMIT', 100);
    const maxLimit = this.configService.get<number>('DOCUMENT_MAX_LIMIT', 500);
    const defaultSortBy = this.configService.get<DocumentSortByInterface[]>('DOCUMENT_DEFAULT_SORT_BY', []);
    const { skip, take, page, limit } = resolvePagination(pagination, defaultLimit, maxLimit);

    const transformedFilter = buildDocumentWhere(filter);

    const findOptions: FindManyOptions<DocumentEntity> = {
      where: {
        ...transformedFilter,
        createdBy: user,
        internal: false,
      },
      order: (sortBy ?? defaultSortBy).reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order;
          return acc;
        },
        {} as Record<string, 'ASC' | 'DESC'>,
      ),
      take,
      skip,
    };

    const [data, total] = await this.documentRepository.findAndCount(findOptions);

    return { data, total, page, limit };
  }

  /**
   * Finds a document by ID.
   */
  async findOneById(id: string, user: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOne({
      where: {
        id,
        createdBy: user,
        internal: false,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }
}
