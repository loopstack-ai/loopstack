import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DocumentEntity, EvalContextInfo, WorkflowEntity } from '@loopstack/shared';
import { WorkflowService } from './workflow.service';
import { ContextInterface } from '@loopstack/shared';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private workflowService: WorkflowService,
  ) {}

  create(
    workflow: WorkflowEntity,
    context: ContextInterface,
    info: EvalContextInfo,
    data: Partial<DocumentEntity>,
  ): DocumentEntity {
    const document = this.documentRepository.create({
      ...data,
      transition: info.transition,
      index: workflow!.documents?.length ?? 0,
      workflowIndex: workflow!.index,
      place: workflow!.place,
      labels: workflow!.labels,
      workflow: { id: workflow.id } as WorkflowEntity,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    });

    this.workflowService.addDocument(workflow, document);
    return document;
  }

  update(workflow: WorkflowEntity, entity: DocumentEntity): DocumentEntity {
    const document = this.documentRepository.create(entity);
    this.workflowService.updateDocumentReference(workflow, document);
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

    return queryBuilder;
  }
}
