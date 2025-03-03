import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/workflow.entity';
import { NamespaceEntity } from '../entities/namespace.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
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
    namespaces: NamespaceEntity[],
  ) {
    const entity = await this.workflowRepository
      .createQueryBuilder('entity')
      .where('entity.project_id = :projectId', {
        projectId: projectId,
      })
      .andWhere('entity.name = :name', { name: name })
      // todo: where the same namespaces
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

  saveWorkflow(entity: WorkflowEntity) {
    return this.workflowRepository.save(entity);
  }
}
