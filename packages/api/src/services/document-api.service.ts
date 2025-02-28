import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { DocumentEntity } from '@loopstack/core/dist/persistence/entities/document.entity';
import { ConfigService } from '@nestjs/config';
import { DocumentSortByDto } from '../dtos/document-sort-by.dto';
import { DocumentQueryDto } from '../dtos/document-query-dto';
import { InjectRepository } from '@nestjs/typeorm';

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
        query: DocumentQueryDto,
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
                ...query.filter,
            },
            order: (query.sortBy ?? defaultSortBy).reduce(
                (acc, sort) => {
                    acc[sort.field] = sort.order;
                    return acc;
                },
                {} as Record<string, 'ASC' | 'DESC'>,
            ),
            take: query.limit ?? defaultLimit,
            skip: query.page && query.limit ? (query.page - 1) * query.limit : 0,
        };

        const [data, total] =
            await this.documentRepository.findAndCount(findOptions);

        return {
            data,
            total,
            page: query.page ?? 1,
            limit: query.limit ?? defaultLimit,
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