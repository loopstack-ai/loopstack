import { Injectable } from '@nestjs/common';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeObject } from '@loopstack/shared';
import { WorkflowStateEntity } from '../entities/workflow-state.entity';
import { WorkflowEntity } from '../entities/workflow.entity';

@Injectable()
export class WorkflowStateService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowStateRepository: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowStateEntity)
    private WorkflowStateMachineRepository: Repository<WorkflowStateEntity>,
  ) {}

  findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowStateRepository.findOne({
      where: { id },
      relations: ['stateMachine'],
    });
  }

  async loadByIdentity(
    projectId: string,
    name: string,
    namespaces: NamespacesType,
  ) {
    const entity = await this.workflowStateRepository
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
    return this.workflowStateRepository.remove(entity);
  }

  async createState(data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const stateMachine = this.WorkflowStateMachineRepository.create({
      place: 'initial',
    });

    const dto = this.workflowStateRepository.create({
      ...data,
      stateMachine,
    });
    const entity = await this.workflowStateRepository.save(dto);
    const loaded = await this.findById(entity.id);

    if (!loaded) {
      throw new Error(`Entity could not be created`);
    }

    return loaded;
  }

  saveWorkflowState(entity: WorkflowEntity) {
    return this.workflowStateRepository.save(entity);
  }
}
