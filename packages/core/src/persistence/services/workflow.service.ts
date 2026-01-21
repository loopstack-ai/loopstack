import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WorkflowEntity } from '@loopstack/common';
import { ClientMessageService } from '../../common/services/client-message.service';
import { PersistenceState } from '../../common';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private clientMessageService: ClientMessageService,
  ) {}

  private createFindQuery(
    namespaceId: string,
    options?: {
      blockName?: string;
      labels?: string[];
    },
  ): SelectQueryBuilder<WorkflowEntity> {
    const { blockName, labels } = options || {};

    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.namespace_id = :namespaceId', { namespaceId })
      .leftJoinAndSelect('workflow.documents', 'document')
      .leftJoinAndSelect('workflow.dependencies', 'dependencies');

    if (blockName) {
      queryBuilder.andWhere('workflow.block_name = :blockName', { blockName });
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

  async findOneByQuery(
    namespaceId: string,
    options?: {
      blockName?: string;
      labels?: string[];
    },
  ) {
    return this.createFindQuery(namespaceId, options).getOne();
  }

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['documents', 'dependencies'],
    });
  }

  async create(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const dto = this.workflowRepository.create(data);
    const entity = await this.workflowRepository.save(dto);
    this.clientMessageService.dispatchWorkflowEvent('workflow.created', entity);

    const loaded = await this.findById(entity.id);
    if (!loaded) {
      throw new Error(`Entity could not be created`);
    }

    return loaded;
  }

  async save(entity: WorkflowEntity, persistenceState: PersistenceState) {
    const savedEntity = await this.workflowRepository.save(
      entity as WorkflowEntity,
    );

    // todo: add persistence states for workflow props too or use more specific events

    this.clientMessageService.dispatchWorkflowEvent(
      'workflow.updated',
      savedEntity,
    );
    if (persistenceState.documentsUpdated) {
      this.clientMessageService.dispatchDocumentEvent(
        'document.created',
        savedEntity,
      );
    }
  }
}
