import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { createHash, DocumentEntity, WorkflowEntity } from '@loopstack/common';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
  ) {}

  createFindQuery(
    namespaceId: string,
    options?: {
      configKey?: string;
      labels?: string[];
    },
  ): SelectQueryBuilder<WorkflowEntity> {
    const { configKey, labels } = options || {};

    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.namespace_id = :namespaceId', { namespaceId })
      .leftJoinAndSelect('workflow.documents', 'document')
      .leftJoinAndSelect('workflow.dependencies', 'dependencies');

    if (configKey) {
      queryBuilder.andWhere('workflow.config_key = :configKey', { configKey });
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

  findOneByQuery(
    namespaceId: string,
    options?: {
      configKey?: string;
      labels?: string[];
    },
  ) {
    return this.createFindQuery(namespaceId, options).getOne();
  }

  findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['documents', 'dependencies'],
    });
  }

  async reload(id: string): Promise<WorkflowEntity> {
    const originalWorkflow = await this.findById(id);
    if (!originalWorkflow) {
      throw new Error(`Cant restore original workflow.`);
    }
    return originalWorkflow;
  }

  async remove(entity) {
    return this.workflowRepository.remove(entity);
  }

  async create(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const dto = this.workflowRepository.create({
      ...data,
      place: 'start',
    } as WorkflowEntity);
    const entity = await this.workflowRepository.save(dto);

    const loaded = await this.findById(entity.id);
    if (!loaded) {
      throw new Error(`Entity could not be created`);
    }

    return loaded;
  }

  save(entity: WorkflowEntity) {
    return this.workflowRepository.save(entity as WorkflowEntity);
  }

  updateDocumentReference(workflow: WorkflowEntity, document: DocumentEntity) {
    const index = workflow.documents.findIndex(
      (item) => item.id === document.id,
    );
    if (-1 !== index) {
      workflow.documents[index] = document;
    } else {
      workflow.documents.push(document);
    }
  }

  createDependenciesHash(workflow: WorkflowEntity) {
    const items = workflow.dependencies ?? [];
    const ids = items
      .filter((item) => !item.isInvalidated)
      .map((item) => item.id)
      .sort();

    return createHash(ids);
  }
}
