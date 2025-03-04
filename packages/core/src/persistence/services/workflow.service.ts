import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder} from 'typeorm';
import { WorkflowEntity } from '../entities';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
  ) {}

  createFindQuery(
      projectId: string,
      options?: {
        name?: string;
        namespaceIds?: string[];
      }
  ): SelectQueryBuilder<WorkflowEntity> {
    const { name, namespaceIds } = options || {};

    const queryBuilder = this.workflowRepository
        .createQueryBuilder('workflow')
        .where('workflow.project_id = :projectId', { projectId })
        .leftJoinAndSelect('workflow.documents', 'document');

    if (name) {
      queryBuilder.andWhere('workflow.name = :name', { name });
    }

    if (namespaceIds !== undefined) {
      if (namespaceIds.length === 0) {
        queryBuilder.andWhere('array_length(workflow.namespace_ids, 1) IS NULL');
      } else {
        queryBuilder.andWhere(
            'workflow.namespace_ids @> :namespaceIds AND array_length(workflow.namespace_ids, 1) = :namespaceCount',
            { namespaceIds, namespaceCount: namespaceIds.length }
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
