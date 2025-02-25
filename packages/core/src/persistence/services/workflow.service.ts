import { Injectable } from '@nestjs/common';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeObject } from '@loopstack/shared';
import { WorkflowStateEntity } from '../entities/workflow-state.entity';
import { WorkflowEntity } from '../entities/workflow.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowStateEntity)
    private workflowStateRepository: Repository<WorkflowStateEntity>,
  ) {}

  findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['state', 'documents'],
    });
  }

  async loadByIdentity(
    projectId: string,
    name: string,
    namespaces: NamespacesType,
  ) {
    const entity = await this.workflowRepository
      .createQueryBuilder('entity')
      .where('entity.project_id = :projectId', {
        projectId: projectId,
      })
      .andWhere('entity.name = :name', { name: name })
      .andWhere('entity.namespaces = :json', {
        json: JSON.stringify(normalizeObject(namespaces)),
      })
      .getOne();

    if (!entity) {
      return undefined;
    }

    return this.findById(entity.id);
  }

  async remove(entity) {
    return this.workflowRepository.remove(entity);
  }

  async createWorkflow(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const workflowState = this.workflowStateRepository.create({
      place: 'initial',
    });

    const state = await this.workflowStateRepository.save(workflowState);

    const dto = this.workflowRepository.create({
      ...data,
      project: { id: data.projectId },
      workspace: { id: data.workspaceId },
      state,
    });
    const entity = await this.workflowRepository.save(dto);

    const loaded = await this.findById(entity.id);
    if (!loaded) {
      throw new Error(`Entity could not be created`);
    }

    return loaded;
  }

  saveWorkflow(entity: WorkflowEntity) {
    return this.workflowRepository.save(entity);
  }
}
