import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEntity } from '../entities';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
  ) {}

  /**
   * Find workflows with optional filtering by name and namespaces
   * @param projectId - The project ID to filter workflows by
   * @param options - Optional filters
   * @param options.name - Optional workflow name to filter by
   * @param options.namespaceIds - If array: workflows must have exactly these namespaces
   *                              If undefined: no namespace filtering is applied
   * @param options.findOne - If true, returns the first matching workflow, otherwise returns all matching workflows
   */
  async findByProject(
      projectId: string,
      options?: {
        name?: string;
        namespaceIds?: string[];
        findOne?: boolean;
      }
  ): Promise<WorkflowEntity[] | WorkflowEntity | null> {
    const queryBuilder = this.workflowRepository
        .createQueryBuilder('workflow')
        .where('workflow.project_id = :projectId', { projectId })
        .leftJoinAndSelect('workflow.documents', 'document');

    if (options?.name) {
      queryBuilder.andWhere('workflow.name = :name', { name: options.name });
    }

    const namespaceIds = options?.namespaceIds;

    // Handle the no namespace filtering case
    if (namespaceIds === undefined) {
      queryBuilder.leftJoinAndSelect('workflow.namespaces', 'namespace');
      return options?.findOne ? queryBuilder.getOne() : queryBuilder.getMany();
    }

    // Handle empty namespaces array (get workflows with NO namespaces)
    if (namespaceIds.length === 0) {
      queryBuilder
          .leftJoin('workflow.namespaces', 'namespace')
          .andWhere('namespace.id IS NULL');
      return options?.findOne ? queryBuilder.getOne() : queryBuilder.getMany();
    }

    // Handle the exact namespaces using subqueries for exact namespace matching

    queryBuilder.leftJoinAndSelect('workflow.namespaces', 'namespace');

    // Workflows must have all the specified namespaces
    queryBuilder.andWhere(qb => {
      const subQuery = qb
          .subQuery()
          .select('wf.id')
          .from('workflow', 'wf')
          .leftJoin('wf.namespaces', 'ns')
          .where('wf.project_id = :projectId', { projectId })
          .andWhere('ns.id IN (:...namespaceIds)', { namespaceIds })
          .groupBy('wf.id')
          .having('COUNT(DISTINCT ns.id) = :namespaceCount', {
            namespaceCount: namespaceIds.length
          });
      return 'workflow.id IN ' + subQuery.getQuery();
    });

    // Workflows must not have any extra namespaces
    queryBuilder.andWhere(qb => {
      const subQuery = qb
          .subQuery()
          .select('wf.id')
          .from('workflow', 'wf')
          .leftJoin('wf.namespaces', 'ns')
          .where('wf.project_id = :projectId', { projectId })
          .andWhere('ns.id NOT IN (:...namespaceIds)', { namespaceIds })
          .groupBy('wf.id');
      return 'workflow.id NOT IN ' + subQuery.getQuery();
    });

    return options?.findOne ? queryBuilder.getOne() : queryBuilder.getMany();
  }

  findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ['state', 'documents'],
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
