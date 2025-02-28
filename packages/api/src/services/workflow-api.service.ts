import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull, FindManyOptions, Repository } from 'typeorm';
import { WorkflowEntity } from '@loopstack/core/dist/persistence/entities/workflow.entity';
import { ConfigService } from '@nestjs/config';
import { WorkflowSortByDto } from '../dtos/workflow-sort-by.dto';
import { WorkflowQueryDto } from '../dtos/workflow-query-dto';
import { InjectRepository } from '@nestjs/typeorm';

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
        query: WorkflowQueryDto,
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
            relations: ['state'],
        };

        const [data, total] =
            await this.workflowRepository.findAndCount(findOptions);

        return {
            data,
            total,
            page: query.page ?? 1,
            limit: query.limit ?? defaultLimit,
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
            relations: ['state'],
        });

        if (!workflow) {
            throw new NotFoundException(`Workflow with ID ${id} not found`);
        }
        return workflow;
    }
}