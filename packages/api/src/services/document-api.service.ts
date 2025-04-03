import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DocumentSortByDto } from '../dtos/document-sort-by.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentFilterDto } from '../dtos/document-filter.dto';
import { DocumentEntity } from '@loopstack/shared';

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
    user: string | null,
    filter: DocumentFilterDto,
    sortBy: DocumentSortByDto[],
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
    const defaultLimit = this.configService.get<number>(
      'DOCUMENT_DEFAULT_LIMIT',
      10,
    );
    const defaultSortBy = this.configService.get<DocumentSortByDto[]>(
      'DOCUMENT_DEFAULT_SORT_BY',
      [],
    );

    const findOptions: FindManyOptions<DocumentEntity> = {
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
      await this.documentRepository.findAndCount(findOptions);

    return {
      data,
      total,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? defaultLimit,
    };
  }

  /**
   * Finds a document by ID.
   */
  async findOneById(id: string, user: string | null): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOne({
      where: {
        id,
        createdBy: user === null ? IsNull() : user,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }
}
