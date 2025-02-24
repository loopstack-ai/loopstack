import { Injectable } from '@nestjs/common';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowState } from '../entities/workflow-state.entity';
import { Repository } from 'typeorm';
import { normalizeObject } from '@loopstack/shared';
import { WorkflowStateMachine } from '../entities/workflow-state-machine.entity';

@Injectable()
export class WorkflowStateService {
  constructor(
    @InjectRepository(WorkflowState)
    private workflowStateRepository: Repository<WorkflowState>,
    @InjectRepository(WorkflowStateMachine)
    private WorkflowStateMachineRepository: Repository<WorkflowStateMachine>,
  ) {}

  findById(id: string): Promise<WorkflowState | null> {
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

  async createState(data: Partial<WorkflowState>): Promise<WorkflowState> {
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

  saveWorkflowState(entity: WorkflowState) {
    return this.workflowStateRepository.save(entity);
  }
}
