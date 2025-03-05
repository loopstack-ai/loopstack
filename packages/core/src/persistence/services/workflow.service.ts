import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WorkflowEntity } from '../entities';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
  ) {}

  createFindQuery(
    namespaceId: string,
    options?: {
      name?: string;
      labels?: string[];
    },
  ): SelectQueryBuilder<WorkflowEntity> {
    const { name, labels } = options || {};

    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.namespace_id = :namespaceId', { namespaceId })
      .leftJoinAndSelect('workflow.documents', 'document');

    if (name) {
      queryBuilder.andWhere('workflow.name = :name', { name });
    }

    if (labels !== undefined) {
      if (labels.length === 0) {
        queryBuilder.andWhere('array_length(workflow.labels, 1) IS NULL');
      } else {
        queryBuilder.andWhere(
          'workflow.labels @> :labels AND array_length(workflow.labels, 1) = :labelCount',
          { labels, labelCount: labels.length },
        );
      }
    }

    return queryBuilder;
  }

  findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['documents'],
    });
  }

  async remove(entity) {
    return this.workflowRepository.remove(entity);
  }

  async create(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const dto = this.workflowRepository.create({
      ...data,
      place: 'initial',
    });
    const entity = await this.workflowRepository.save(dto);

    const loaded = await this.findById(entity.id);
    if (!loaded) {
      throw new Error(`Entity could not be created`);
    }

    return loaded;
  }

  save(entity: WorkflowEntity) {
    return this.workflowRepository.save(entity);
  }
}
