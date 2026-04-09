import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { PersistenceState, WorkflowEntity, WorkflowState, WorkspaceEntity } from '@loopstack/common';
import { ClientMessageService } from '../../common/services/client-message.service';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private clientMessageService: ClientMessageService,
  ) {}

  getWorkflow(id: string, userId: string, relations: string[] = ['workspace', 'workspace.environments']) {
    const where: FindOptionsWhere<WorkflowEntity> = {
      id,
      createdBy: userId,
    };

    return this.workflowRepository.findOne({
      where,
      relations,
    });
  }

  async createRootWorkflow(
    data: Partial<WorkflowEntity>,
    workspace: WorkspaceEntity,
    user: string,
    parent?: WorkflowEntity | null,
  ) {
    const lastRunNumber = await this.getMaxRun(user, workspace.id);

    const workflow = this.workflowRepository.create({
      ...data,
      run: lastRunNumber + 1,
      createdBy: user,
      workspace,
      parent: parent || null,
    });
    return await this.workflowRepository.save(workflow);
  }

  async setWorkflowStatus(workflow: WorkflowEntity, status: WorkflowState) {
    workflow.status = status;
    await this.workflowRepository.save(workflow);
  }

  async getMaxRun(userId: string, workspaceId: string): Promise<number> {
    const query = this.workflowRepository
      .createQueryBuilder('workflow')
      .select('MAX(workflow.run)', 'maxRun')
      .where('workflow.workspaceId = :workspaceId', { workspaceId });

    if (userId) {
      query.andWhere('workflow.createdBy = :userId', { userId });
    }

    const result = await query.getRawOne<{ maxRun: number | null }>();
    return result?.maxRun ? Number(result.maxRun) : 0;
  }

  private createFindQuery(
    parentWorkflowId?: string,
    options?: {
      alias?: string;
      className?: string;
      labels?: string[];
    },
  ): SelectQueryBuilder<WorkflowEntity> {
    const { alias, className, labels } = options || {};

    const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

    if (parentWorkflowId) {
      queryBuilder.where('workflow.parent_id = :parentWorkflowId', { parentWorkflowId });
    }

    queryBuilder.leftJoinAndSelect('workflow.documents', 'document');

    if (alias) {
      queryBuilder.andWhere('workflow.alias = :alias', { alias });
    }

    if (className) {
      queryBuilder.andWhere('workflow.class_name = :className', { className });
    }

    if (labels !== undefined) {
      if (labels.length === 0) {
        queryBuilder.andWhere('array_length(workflow.labels, 1) IS NULL');
      } else {
        queryBuilder.andWhere('workflow.labels @> :labels AND array_length(workflow.labels, 1) = :labelCount', {
          labels,
          labelCount: labels.length,
        });
      }
    }

    return queryBuilder;
  }

  async findOneByQuery(
    parentWorkflowId?: string,
    options?: {
      alias?: string;
      className?: string;
      labels?: string[];
    },
  ) {
    return this.createFindQuery(parentWorkflowId, options).getOne();
  }

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['documents'],
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

  async save(entity: WorkflowEntity, persistenceState: PersistenceState, queryRunner?: QueryRunner) {
    const savedEntity = queryRunner
      ? await queryRunner.manager.save(WorkflowEntity, entity)
      : await this.workflowRepository.save(entity);

    this.clientMessageService.dispatchWorkflowEvent('workflow.updated', savedEntity);
    if (persistenceState.documentsUpdated) {
      this.clientMessageService.dispatchDocumentEvent('document.created', savedEntity);
    }
  }
}
