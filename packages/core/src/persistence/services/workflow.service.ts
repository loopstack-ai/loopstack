import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { PersistenceState, WorkflowEntity, WorkflowState, WorkspaceEntity } from '@loopstack/common';
import { ClientMessageService } from '../../common/services/client-message.service.js';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private clientMessageService: ClientMessageService,
  ) {}

  getWorkflow(id: string, userId: string, relations: string[] = ['workspace']) {
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

  async findChildrenByParentId(parentId: string): Promise<WorkflowEntity[]> {
    return this.workflowRepository.find({
      where: { parentId },
    });
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
    this.clientMessageService.dispatchWorkflowCreated(entity);

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

    this.clientMessageService.dispatchWorkflowUpdated(savedEntity);
    if (persistenceState.documentsUpdated) {
      this.clientMessageService.dispatchDocumentCreated(savedEntity);
    }
  }
}
