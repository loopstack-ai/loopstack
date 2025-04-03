import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DocumentEntity, WorkflowEntity } from '../entities';
import { WorkflowService } from './workflow.service';
import { ContextInterface } from '@loopstack/shared';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private readonly workflowService: WorkflowService,
  ) {}

  create(
    workflow: WorkflowEntity,
    context: ContextInterface,
    data: Partial<DocumentEntity>,
  ): DocumentEntity {
    const document = this.documentRepository.create({
      ...data,
      index: workflow!.documents?.length ?? 0,
      workflowIndex: workflow!.index,
      place: workflow!.place,
      labels: workflow!.labels,
      workflow: workflow,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    });

    this.workflowService.addDocument(workflow, document);
    return document;
  }

  createDocumentsQuery(
    projectId: string,
    workspaceId: string,
    where?: {
      name: string;
    },
    options?: {
      isGlobal?: boolean;
      labels?: string[];
      ltWorkflowIndex?: string;
    },
  ): SelectQueryBuilder<DocumentEntity> {
    const queryBuilder = this.documentRepository.createQueryBuilder();

    if (where) {
      queryBuilder.andWhere(where);
    }

    if (undefined !== options?.ltWorkflowIndex) {
      queryBuilder.andWhere(
        `(workflow_index <@ :index OR text(workflow_index) < text(:index))`,
        { index: options.ltWorkflowIndex },
      );
    }

    // we dont want invalidate items
    queryBuilder.andWhere('is_invalidated = false');

    if (!options?.isGlobal) {
      // ofc needs to be from same project
      queryBuilder.andWhere('project_id = :projectId', {
        projectId,
      });
    } else {
      queryBuilder.andWhere('workspace_id = :workspaceId', {
        workspaceId,
      });
    }

    if (options?.labels?.length) {
      queryBuilder.andWhere('labels @> ARRAY[:...labels]::varchar[]', {
        labels: options.labels,
      });
    }

    queryBuilder.orderBy('workflow_index', 'DESC');

    // console.log(queryBuilder.getSql(), queryBuilder.getParameters());

    return queryBuilder;
  }
}
